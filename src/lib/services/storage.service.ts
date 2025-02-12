import { AuthConfig } from "@/types/auth";

const CREDENTIALS_KEY = "komgaCredentials";
const USER_KEY = "komgaUser";
const TTL_CONFIG_KEY = "ttlConfig";

interface TTLConfig {
  defaultTTL: number;
  homeTTL: number;
  librariesTTL: number;
  seriesTTL: number;
  booksTTL: number;
  imagesTTL: number;
}

class StorageService {
  private static instance: StorageService;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Stocke les credentials de manière sécurisée
   */
  setCredentials(config: AuthConfig, remember: boolean = false): void {
    const storage = remember ? localStorage : sessionStorage;

    // Encodage basique des credentials en base64
    const encoded = btoa(JSON.stringify(config));
    console.log("StorageService - Stockage des credentials:", {
      storage: remember ? "localStorage" : "sessionStorage",
      config: {
        serverUrl: config.serverUrl,
        hasCredentials: !!config.credentials,
      },
    });

    storage.setItem(CREDENTIALS_KEY, encoded);

    // Définir aussi un cookie pour le middleware
    const cookieValue = `${CREDENTIALS_KEY}=${encoded}; path=/; samesite=strict`;
    const maxAge = remember ? `; max-age=${30 * 24 * 60 * 60}` : "";
    document.cookie = cookieValue + maxAge;

    console.log("StorageService - Cookie défini:", cookieValue + maxAge);
  }

  /**
   * Récupère les credentials stockés
   */
  getCredentials(): AuthConfig | null {
    if (typeof window === "undefined") return null;

    const storage =
      localStorage.getItem(CREDENTIALS_KEY) || sessionStorage.getItem(CREDENTIALS_KEY);
    console.log("StorageService - Lecture des credentials:", {
      fromLocalStorage: !!localStorage.getItem(CREDENTIALS_KEY),
      fromSessionStorage: !!sessionStorage.getItem(CREDENTIALS_KEY),
      value: storage,
    });

    if (!storage) return null;

    try {
      const config = JSON.parse(atob(storage));
      console.log("StorageService - Credentials décodés:", {
        serverUrl: config.serverUrl,
        hasCredentials: !!config.credentials,
      });
      return config;
    } catch (error) {
      console.error("StorageService - Erreur de décodage des credentials:", error);
      return null;
    }
  }

  /**
   * Stocke les données utilisateur
   */
  setUserData<T>(data: T, remember: boolean = false): void {
    const storage = remember ? localStorage : sessionStorage;
    const encoded = btoa(JSON.stringify(data));
    storage.setItem(USER_KEY, encoded);

    // Définir aussi un cookie pour le middleware
    document.cookie = `${USER_KEY}=${encoded}; path=/; samesite=strict; ${
      remember ? `max-age=${30 * 24 * 60 * 60}` : ""
    }`;
  }

  /**
   * Récupère les données utilisateur
   */
  getUserData<T>(): T | null {
    if (typeof window === "undefined") return null;

    const storage = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    if (!storage) return null;

    try {
      return JSON.parse(atob(storage));
    } catch {
      return null;
    }
  }

  /**
   * Stocke la configuration des TTL
   */
  setTTLConfig(config: TTLConfig): void {
    localStorage.setItem(TTL_CONFIG_KEY, JSON.stringify(config));
  }

  /**
   * Récupère la configuration des TTL
   */
  getTTLConfig(): TTLConfig | null {
    const stored = localStorage.getItem(TTL_CONFIG_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  /**
   * Efface toutes les données stockées
   */
  clear(): void {
    localStorage.removeItem(CREDENTIALS_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(CREDENTIALS_KEY);
    sessionStorage.removeItem(USER_KEY);
    document.cookie = `${CREDENTIALS_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${USER_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }

  getUser() {
    try {
      const userStr = localStorage.getItem("komgaUser");
      if (!userStr) return null;
      return JSON.parse(atob(userStr));
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur:", error);
      return null;
    }
  }

  clearAll() {
    localStorage.removeItem("komgaUser");
    localStorage.removeItem("komgaCredentials");
    localStorage.removeItem("ttlConfig");
  }
}

export const storageService = StorageService.getInstance();
