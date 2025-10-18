import type { AuthConfig } from "@/types/auth";
import type { CacheType } from "@/types/cache";
import { getServerCacheService } from "./server-cache.service";
import { ConfigDBService } from "./config-db.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type { KomgaConfig } from "@/types/komga";
import type { ServerCacheService } from "./server-cache.service";
import { RequestMonitorService } from "./request-monitor.service";
import { RequestQueueService } from "./request-queue.service";

export type { CacheType };

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
      if (error instanceof AppError && error.code === ERROR_CODES.KOMGA.MISSING_CONFIG) {
        throw error;
      }
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

  protected static async resolveWithFallback(url: string): Promise<string> {
    // DNS resolution is only needed server-side and causes build issues
    // The fetch API will handle DNS resolution automatically
    return url;
  }

  protected static async fetchFromApi<T>(
    urlBuilder: KomgaUrlBuilder,
    headersOptions = {},
    options: KomgaRequestInit = {}
  ): Promise<T> {
    const config: AuthConfig = await this.getKomgaConfig();
    const { path, params } = urlBuilder;
    const url = await this.resolveWithFallback(this.buildUrl(config, path, params));

    const headers: Headers = this.getAuthHeaders(config);
    if (headersOptions) {
      for (const [key, value] of Object.entries(headersOptions)) {
        headers.set(key as string, value as string);
      }
    }

    // Timeout de 60 secondes au lieu de 10 par défaut
    const timeoutMs = 60000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      // Enqueue la requête pour limiter la concurrence
      const response = await RequestQueueService.enqueue(async () => {
        try {
          return await fetch(url, { 
            headers, 
            ...options,
            signal: controller.signal,
            // Configure undici connection timeouts
            // @ts-ignore - undici-specific options not in standard fetch types
            connectTimeout: timeoutMs,
            bodyTimeout: timeoutMs,
            headersTimeout: timeoutMs,
          });
        } catch (fetchError: any) {
          // Gestion spécifique des erreurs DNS
          if (fetchError?.cause?.code === 'EAI_AGAIN' || fetchError?.code === 'EAI_AGAIN') {
            console.error(`DNS resolution failed for ${url}. Retrying with different DNS settings...`);
            
            // Retry avec des paramètres DNS différents
            return await fetch(url, { 
              headers, 
              ...options,
              signal: controller.signal,
              // @ts-ignore - undici-specific options
              connectTimeout: timeoutMs,
              bodyTimeout: timeoutMs,
              headersTimeout: timeoutMs,
              // Force IPv4 si IPv6 pose problème
              // @ts-ignore
              family: 4,
            });
          }
          
          // Retry automatique sur timeout de connexion (cold start)
          if (fetchError?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
            // eslint-disable-next-line no-console
            console.log(`⏱️  Connection timeout for ${url}. Retrying once (cold start)...`);
            
            return await fetch(url, { 
              headers, 
              ...options,
              signal: controller.signal,
              // @ts-ignore - undici-specific options
              connectTimeout: timeoutMs,
              bodyTimeout: timeoutMs,
              headersTimeout: timeoutMs,
            });
          }
          
          throw fetchError;
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new AppError(ERROR_CODES.KOMGA.HTTP_ERROR, {
          status: response.status,
          statusText: response.statusText,
        });
      }

      return options.isImage ? (response as T) : response.json();
    } catch (error) {
      throw error;
    } finally {
      clearTimeout(timeoutId);
      RequestMonitorService.decrementActive();
    }
  }
}
