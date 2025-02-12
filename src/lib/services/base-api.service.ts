import { cookies } from "next/headers";
import { AuthConfig } from "@/types/auth";
import { serverCacheService } from "./server-cache.service";

export abstract class BaseApiService {
  protected static async getKomgaConfig(): Promise<AuthConfig> {
    const configCookie = cookies().get("komgaCredentials");
    if (!configCookie) {
      throw new Error("Configuration Komga manquante");
    }

    try {
      return JSON.parse(atob(configCookie.value));
    } catch (error) {
      throw new Error("Configuration Komga invalide");
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
    ttl: number = 5 * 60 // 5 minutes par défaut
  ): Promise<T> {
    return serverCacheService.getOrSet(key, fetcher, ttl);
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

    return url.toString();
  }
}
