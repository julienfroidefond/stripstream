import type { AuthConfig } from "@/types/auth";
import { ConfigDBService } from "./config-db.service";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import type { KomgaConfig } from "@/types/komga";
import logger from "@/lib/logger";

interface KomgaRequestInit extends RequestInit {
  isImage?: boolean;
  noJson?: boolean;
}

interface KomgaUrlBuilder {
  path: string;
  params?: Record<string, string | string[]>;
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

  protected static buildUrl(
    config: AuthConfig,
    path: string,
    params?: Record<string, string | string[]>
  ): string {
    const url = new URL(`${config.serverUrl}/api/v1/${path}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((v) => {
              if (v !== undefined) {
                url.searchParams.append(key, v);
              }
            });
          } else {
            url.searchParams.append(key, value);
          }
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

    const isDebug = process.env.KOMGA_DEBUG === "true";
    const startTime = isDebug ? Date.now() : 0;

    if (isDebug) {
      logger.info(
        {
          url,
          method: options.method || "GET",
          params,
          isImage: options.isImage,
          noJson: options.noJson,
        },
        "🔵 Komga Request"
      );
    }

    // Timeout de 15 secondes pour éviter les blocages longs
    const timeoutMs = 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let response: Response;

      try {
        response = await fetch(url, {
          headers,
          ...options,
          signal: controller.signal,
          // @ts-ignore - undici-specific options not in standard fetch types
          connectTimeout: timeoutMs,
          bodyTimeout: timeoutMs,
          headersTimeout: timeoutMs,
        });
      } catch (fetchError: any) {
        // Gestion spécifique des erreurs DNS
        if (fetchError?.cause?.code === "EAI_AGAIN" || fetchError?.code === "EAI_AGAIN") {
          logger.error(`DNS resolution failed for ${url}. Retrying with different DNS settings...`);

          response = await fetch(url, {
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
        } else if (fetchError?.cause?.code === "UND_ERR_CONNECT_TIMEOUT") {
          // Retry automatique sur timeout de connexion (cold start)
          logger.info(`⏱️  Connection timeout for ${url}. Retrying once (cold start)...`);

          response = await fetch(url, {
            headers,
            ...options,
            signal: controller.signal,
            // @ts-ignore - undici-specific options
            connectTimeout: timeoutMs,
            bodyTimeout: timeoutMs,
            headersTimeout: timeoutMs,
          });
        } else {
          throw fetchError;
        }
      }

      clearTimeout(timeoutId);

      if (isDebug) {
        const duration = Date.now() - startTime;
        logger.info(
          {
            url,
            status: response.status,
            duration: `${duration}ms`,
            ok: response.ok,
          },
          "🟢 Komga Response"
        );
      }

      if (!response.ok) {
        if (isDebug) {
          logger.error(
            {
              url,
              status: response.status,
              statusText: response.statusText,
            },
            "🔴 Komga Error Response"
          );
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
        logger.error(
          {
            url,
            error: error instanceof Error ? error.message : String(error),
            duration: `${duration}ms`,
          },
          "🔴 Komga Request Failed"
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
