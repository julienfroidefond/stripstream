import { cookies } from "next/headers";
import { AuthConfig } from "@/types/auth";
import { serverCacheService } from "./server-cache.service";
import { ConfigDBService } from "./config-db.service";

// Types de cache disponibles
export type CacheType = "DEFAULT" | "HOME" | "LIBRARIES" | "SERIES" | "BOOKS" | "IMAGES";

export abstract class BaseApiService {
  protected static async getKomgaConfig(): Promise<AuthConfig> {
    try {
      const config = await ConfigDBService.getConfig();
      return {
        serverUrl: config.url,
        credentials: {
          username: config.username,
          password: config.password,
        },
      };
    } catch (error) {
      console.error("Erreur lors de la récupération de la configuration:", error);
      throw new Error("Configuration Komga non trouvée");
    }
  }

  protected static getAuthHeaders(config: AuthConfig): Headers {
    if (!config.credentials?.username || !config.credentials?.password) {
      throw new Error("Credentials Komga manquants");
    }

    const auth = Buffer.from(
      `${config.credentials.username}:${config.credentials.password}`
    ).toString("base64");

    return new Headers({
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    });
  }

  protected static async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    type: CacheType = "DEFAULT"
  ): Promise<T> {
    return serverCacheService.getOrSet(key, fetcher, type);
  }

  protected static handleError(error: unknown, defaultMessage: string): never {
    console.error("API Error:", error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(defaultMessage);
  }

  protected static buildUrl(
    config: AuthConfig,
    path: string,
    params?: Record<string, string>
  ): string {
    const url = new URL(`${config.serverUrl}/api/v1/${path}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, value);
        }
      });
    }

    // Log de l'URL finale
    console.log(`🔄 [Komga API] ${url.toString()}`);

    return url.toString();
  }

  protected static async fetchFromApi<T>(url: string, headers: Headers): Promise<T> {
    const response = await fetch(url, { headers });

    // Log du résultat de la requête
    console.log(`📡 [Komga API] ${response.status} ${response.statusText} - ${url}`);

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
