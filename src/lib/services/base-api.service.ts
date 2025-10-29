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
import { CircuitBreakerService } from "./circuit-breaker.service";
import { PreferencesService } from "./preferences.service";
import logger from "@/lib/logger";

export type { CacheType };

interface KomgaRequestInit extends RequestInit {
  isImage?: boolean;
  noJson?: boolean;
}

interface KomgaUrlBuilder {
  path: string;
  params?: Record<string, string>;
}

export abstract class BaseApiService {
  private static requestQueueInitialized = false;
  private static circuitBreakerInitialized = false;

  /**
   * Initialise le RequestQueueService avec les préférences de l'utilisateur
   */
  private static async initializeRequestQueue(): Promise<void> {
    if (this.requestQueueInitialized) {
      return;
    }

    try {
      // Configurer le getter qui récupère dynamiquement la valeur depuis les préférences
      RequestQueueService.setMaxConcurrentGetter(async () => {
        try {
          const preferences = await PreferencesService.getPreferences();
          return preferences.komgaMaxConcurrentRequests;
        } catch (error) {
          logger.error({ err: error }, 'Failed to get preferences for request queue');
          return 5; // Valeur par défaut
        }
      });
      
      this.requestQueueInitialized = true;
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize request queue');
    }
  }

  /**
   * Initialise le CircuitBreakerService avec les préférences de l'utilisateur
   */
  private static async initializeCircuitBreaker(): Promise<void> {
    if (this.circuitBreakerInitialized) {
      return;
    }

    try {
      // Configurer le getter qui récupère dynamiquement la config depuis les préférences
      CircuitBreakerService.setConfigGetter(async () => {
        try {
          const preferences = await PreferencesService.getPreferences();
          return preferences.circuitBreakerConfig;
        } catch (error) {
          logger.error({ err: error }, 'Failed to get preferences for circuit breaker');
          return {
            threshold: 5,
            timeout: 30000,
            resetTimeout: 60000,
          };
        }
      });
      
      this.circuitBreakerInitialized = true;
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize circuit breaker');
    }
  }

  protected static async getKomgaConfig(): Promise<AuthConfig> {
    // Initialiser les services si ce n'est pas déjà fait
    await Promise.all([
      this.initializeRequestQueue(),
      this.initializeCircuitBreaker(),
    ]);
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
      logger.error({ err: error }, "Erreur lors de la récupération de la configuration");
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

    const isDebug = process.env.KOMGA_DEBUG === 'true';
    const startTime = isDebug ? Date.now() : 0;
    
    if (isDebug) {
      logger.info({
        url,
        method: options.method || 'GET',
        params,
        isImage: options.isImage,
        noJson: options.noJson,
      }, '🔵 Komga Request');
    }

    // Timeout réduit à 15 secondes pour éviter les blocages longs
    const timeoutMs = 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      // Utiliser le circuit breaker pour éviter de surcharger Komga
      const response = await CircuitBreakerService.execute(async () => {
        // Enqueue la requête pour limiter la concurrence
        return await RequestQueueService.enqueue(async () => {
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
            logger.error(`DNS resolution failed for ${url}. Retrying with different DNS settings...`);
            
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
            logger.info(`⏱️  Connection timeout for ${url}. Retrying once (cold start)...`);
            
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
      });
      clearTimeout(timeoutId);

      if (isDebug) {
        const duration = Date.now() - startTime;
        logger.info({
          url,
          status: response.status,
          duration: `${duration}ms`,
          ok: response.ok,
        }, '🟢 Komga Response');
      }

      if (!response.ok) {
        if (isDebug) {
          logger.error({
            url,
            status: response.status,
            statusText: response.statusText,
          }, '🔴 Komga Error Response');
        }
        throw new AppError(ERROR_CODES.KOMGA.HTTP_ERROR, {
          status: response.status,
          statusText: response.statusText,
        });
      }

      if (options.isImage) {
        return response as T;
      }
      
      if (options.noJson) {
        return undefined as T;
      }
      
      return response.json();
    } catch (error) {
      if (isDebug) {
        const duration = Date.now() - startTime;
        logger.error({
          url,
          error: error instanceof Error ? error.message : String(error),
          duration: `${duration}ms`,
        }, '🔴 Komga Request Failed');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      RequestMonitorService.decrementActive();
    }
  }
}
