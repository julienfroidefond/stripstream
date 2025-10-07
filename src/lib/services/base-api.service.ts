import type { AuthConfig } from "@/types/auth";
import { getServerCacheService } from "./server-cache.service";
import { ConfigDBService } from "./config-db.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type { KomgaConfig } from "@/types/komga";
import type { ServerCacheService } from "./server-cache.service";
import { fetchWithCacheDetection } from "../utils/fetch-with-cache-detection";
// Types de cache disponibles
export type CacheType = "DEFAULT" | "HOME" | "LIBRARIES" | "SERIES" | "BOOKS" | "IMAGES";

interface KomgaRequestInit extends RequestInit {
  isImage?: boolean;
}

interface KomgaUrlBuilder {
  path: string;
  params?: Record<string, string>;
}

export abstract class BaseApiService {
  protected static async getKomgaConfig(): Promise<AuthConfig> {
    try {
      const config: KomgaConfig | null = await ConfigDBService.getConfig();
      if (!config) {
        throw new AppError(ERROR_CODES.KOMGA.MISSING_CONFIG);
      }

      return {
        serverUrl: config.url,
        authHeader: config.authHeader,
      };
    } catch (error) {
      console.error("Erreur lors de la récupération de la configuration:", error);
      throw new AppError(ERROR_CODES.KOMGA.MISSING_CONFIG, {}, error);
    }
  }

  protected static getAuthHeaders(config: AuthConfig): Headers {
    if (!config.authHeader) {
      throw new AppError(ERROR_CODES.KOMGA.MISSING_CREDENTIALS);
    }

    return new Headers({
      Authorization: `Basic ${config.authHeader}`,
      Accept: "application/json",
    });
  }

  protected static async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    type: CacheType = "DEFAULT"
  ): Promise<T> {
    const cacheService: ServerCacheService = await getServerCacheService();

    try {
      const result = await cacheService.getOrSet(key, fetcher, type);

      return result;
    } catch (error) {
      throw error;
    }
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

  protected static async fetchFromApi<T>(
    urlBuilder: KomgaUrlBuilder,
    headersOptions = {},
    options: KomgaRequestInit = {}
  ): Promise<T> {
    const config: AuthConfig = await this.getKomgaConfig();
    const { path, params } = urlBuilder;
    const url = this.buildUrl(config, path, params);

    const headers: Headers = this.getAuthHeaders(config);
    if (headersOptions) {
      for (const [key, value] of Object.entries(headersOptions)) {
        headers.set(key as string, value as string);
      }
    }

    try {
      const response = await fetchWithCacheDetection(url, { headers, ...options });

      if (!response.ok) {
        throw new AppError(ERROR_CODES.KOMGA.HTTP_ERROR, {
          status: response.status,
          statusText: response.statusText,
        });
      }

      return options.isImage ? (response as T) : response.json();
    } catch (error) {
      throw error;
    }
  }
}
