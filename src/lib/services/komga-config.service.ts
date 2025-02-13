import { AuthConfig } from "@/types/auth";
import { storageService } from "./storage.service";
import { STORAGE_KEYS } from "@/lib/constants";

const { CREDENTIALS } = STORAGE_KEYS;

class KomgaConfigService {
  private static instance: KomgaConfigService;

  private constructor() {}

  public static getInstance(): KomgaConfigService {
    if (!KomgaConfigService.instance) {
      KomgaConfigService.instance = new KomgaConfigService();
    }
    return KomgaConfigService.instance;
  }

  /**
   * Récupère la configuration Komga (fonctionne côté client et serveur)
   */
  getConfig(serverCookies?: any): AuthConfig | null {
    // Côté serveur
    if (typeof window === "undefined" && serverCookies) {
      try {
        const configCookie = serverCookies.get(CREDENTIALS)?.value;
        if (!configCookie) return null;
        return JSON.parse(atob(configCookie));
      } catch (error) {
        console.error(
          "KomgaConfigService - Erreur lors de la récupération de la config côté serveur:",
          error
        );
        return null;
      }
    }

    // Côté client
    return storageService.getCredentials();
  }

  /**
   * Définit la configuration Komga (côté client uniquement)
   */
  setConfig(config: AuthConfig, remember: boolean = false): void {
    if (typeof window === "undefined") {
      console.warn("KomgaConfigService - setConfig ne peut être utilisé que côté client");
      return;
    }

    const storage = remember ? localStorage : sessionStorage;
    const encoded = btoa(JSON.stringify(config));

    // Stocker dans le storage
    storage.setItem(CREDENTIALS, encoded);

    // Définir le cookie
    const cookieValue = `${CREDENTIALS}=${encoded}; path=/; samesite=strict`;
    const maxAge = remember ? `; max-age=${30 * 24 * 60 * 60}` : "";
    document.cookie = cookieValue + maxAge;
  }

  /**
   * Vérifie si la configuration est valide
   */
  isConfigValid(config: AuthConfig | null): boolean {
    if (!config) return false;
    return !!(config.serverUrl && config.credentials?.username && config.credentials?.password);
  }

  /**
   * Efface la configuration
   */
  clearConfig(): void {
    if (typeof window === "undefined") return;

    localStorage.removeItem(CREDENTIALS);
    sessionStorage.removeItem(CREDENTIALS);
    document.cookie = `${CREDENTIALS}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }

  /**
   * Récupère l'URL du serveur à partir de la configuration
   */
  getServerUrl(serverCookies?: any): string | null {
    const config = this.getConfig(serverCookies);
    return config?.serverUrl || null;
  }

  /**
   * Récupère les credentials à partir de la configuration
   */
  getCredentials(serverCookies?: any): { username: string; password: string } | null {
    const config = this.getConfig(serverCookies);
    return config?.credentials || null;
  }

  /**
   * Construit une URL complète pour l'API Komga
   */
  buildApiUrl(path: string, serverCookies?: any): string {
    const serverUrl = this.getServerUrl(serverCookies);
    if (!serverUrl) throw new Error("URL du serveur non disponible");
    return `${serverUrl}/api/v1/${path}`;
  }

  /**
   * Génère les en-têtes d'authentification pour les requêtes
   */
  getAuthHeaders(serverCookies?: any): Headers {
    const credentials = this.getCredentials(serverCookies);
    if (!credentials) throw new Error("Credentials non disponibles");

    const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64");
    const headers = new Headers();
    headers.set("Authorization", `Basic ${auth}`);
    headers.set("Accept", "application/json");

    return headers;
  }

  /**
   * Vérifie et récupère la configuration complète, lance une erreur si invalide
   */
  validateAndGetConfig(serverCookies?: any): AuthConfig {
    const config = this.getConfig(serverCookies);
    if (!this.isConfigValid(config)) {
      throw new Error("Configuration Komga manquante ou invalide");
    }
    return config as AuthConfig;
  }
}

export const komgaConfigService = KomgaConfigService.getInstance();
