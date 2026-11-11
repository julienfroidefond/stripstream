import { unstable_cache } from "next/cache";

import type { ErrorCode } from "@/constants/errorCodes";
import logger from "@/lib/logger";
import { AppError } from "@/utils/errors";
import { codeForHttpStatus, isConnectionError, type ProviderHttpCodes } from "@/utils/http-error";

export type ProviderQueryParams = Record<string, string | string[] | undefined>;

export interface ProviderRequestOptions {
  method?: string;
  body?: BodyInit | null;
  cache?: RequestCache;
  revalidate?: number;
  tags?: string[];
}

export interface ProviderRetryPolicy {
  shouldRetry(error: unknown): boolean;
  beforeRetry?(error: unknown, url: string): void;
  delayMs?: number;
}

export interface ProviderTransportPolicy {
  label: string;
  origin: string;
  pathPrefix?: string;
  headers: Record<string, string>;
  httpCodes: ProviderHttpCodes;
  timeoutMs: number;
  retry?: ProviderRetryPolicy;
  fallbackErrorCode: ErrorCode;
  cachePostWithUnstableCache?: boolean;
  cacheKey?(url: string, body: BodyInit | null): string[];
  debugRequest?(): boolean;
  debugCache?(): boolean;
}

interface ProviderFetchInit extends RequestInit {
  next?: { revalidate?: number; tags?: string[] };
}

export function errorCodeOf(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code ?? candidate.cause?.code;
}

export function matchesErrorCode(
  error: unknown,
  codes: ReadonlySet<string>
): boolean {
  const code = errorCodeOf(error);
  return code !== undefined && codes.has(code);
}

/**
 * Le seul cycle de requête JSON des providers : construction d'URL, auth,
 * cache Next, retry, timeout, corps vide et mapping d'erreurs. Chaque provider
 * ne fournit que sa politique (origine, en-têtes, codes HTTP, règles de retry).
 */
export class ProviderTransport {
  constructor(private readonly policy: ProviderTransportPolicy) {}

  buildUrl(path: string, params?: ProviderQueryParams): string {
    const origin = this.policy.origin.replace(/\/+$/, "");
    const prefix = (this.policy.pathPrefix ?? "").replace(/^\/+|\/+$/g, "");
    const cleanPath = path.replace(/^\/+/, "");
    const url = new URL(`${origin}${prefix ? `/${prefix}` : ""}/${cleanPath}`);

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value === undefined) continue;
      for (const item of Array.isArray(value) ? value : [value]) {
        url.searchParams.append(key, item);
      }
    }

    return url.toString();
  }

  buildHeaders(options: { json?: boolean; accept?: string } = {}): Headers {
    const headers = new Headers(this.policy.headers);
    if (options.accept) headers.set("Accept", options.accept);
    if (options.json) headers.set("Content-Type", "application/json");
    return headers;
  }

  async request<T>(
    path: string,
    params?: ProviderQueryParams,
    options: ProviderRequestOptions = {}
  ): Promise<T> {
    const { revalidate, tags, ...requestInit } = options;
    const url = this.buildUrl(path, params);
    const headers = this.buildHeaders({ json: Boolean(requestInit.body) });
    const isDebug = this.policy.debugRequest?.() ?? false;
    const isCacheDebug = this.policy.debugCache?.() ?? false;

    if (isDebug) {
      logger.info(
        { url, method: requestInit.method || "GET", params, revalidate },
        `${this.policy.label} Request`
      );
    }
    if (isCacheDebug) {
      if (tags) {
        logger.info({ url, cache: "tags", tags }, "Cache tags");
      } else if (revalidate !== undefined) {
        logger.info({ url, cache: "revalidate", ttl: revalidate }, "Cache revalidate");
      } else {
        logger.info({ url, cache: "none" }, "Cache none");
      }
    }

    const nextOptions = tags
      ? { tags }
      : revalidate !== undefined
        ? { revalidate }
        : undefined;
    const fetchOptions: ProviderFetchInit = {
      ...requestInit,
      headers,
      next: nextOptions,
    };

    // Next.js ne cache pas les fetch POST — on enveloppe la requête dans
    // unstable_cache lorsque la politique du provider le demande.
    if (this.policy.cachePostWithUnstableCache && requestInit.method === "POST" && nextOptions) {
      const cacheKey = this.policy.cacheKey?.(url, requestInit.body ?? null) ?? [
        this.policy.label,
        url,
        String(requestInit.body ?? ""),
      ];
      return unstable_cache(
        () => this.executeRequest<T>(url, fetchOptions),
        cacheKey,
        nextOptions
      )();
    }

    return this.executeRequest<T>(url, fetchOptions);
  }

  private async executeRequest<T>(
    url: string,
    fetchOptions: ProviderFetchInit
  ): Promise<T> {
    const isDebug = this.policy.debugRequest?.() ?? false;
    const startTime = isDebug ? Date.now() : 0;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.policy.timeoutMs);

    try {
      const response = await this.fetchWithRetry(url, fetchOptions, controller.signal);
      clearTimeout(timeoutId);

      if (isDebug) {
        logger.info(
          {
            url,
            status: response.status,
            duration: `${Date.now() - startTime}ms`,
            ok: response.ok,
          },
          `${this.policy.label} Response`
        );
      }

      if (!response.ok) {
        if (isDebug) {
          logger.error(
            { url, status: response.status, statusText: response.statusText },
            `${this.policy.label} Error Response`
          );
        }
        throw new AppError(codeForHttpStatus(response.status, this.policy.httpCodes), {
          status: response.status,
          statusText: response.statusText,
        });
      }

      // 204 No Content (PUT/DELETE rating, scan, …) ou corps vide : pas de JSON à parser.
      const text = await response.text();
      return (text === "" ? null : JSON.parse(text)) as T;
    } catch (error) {
      if (isDebug) {
        logger.error(
          {
            url,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`,
          },
          `${this.policy.label} Request Failed`
        );
      }
      if (error instanceof AppError) throw error;
      // Provider injoignable (DNS, socket, refus) → warn pour ne pas spammer le log :
      // l'AppError remontée sera de toute façon loggée par les couches appelantes.
      if (isConnectionError(error)) {
        logger.warn({ err: error, url }, `${this.policy.label} request failed`);
      } else {
        logger.error({ err: error, url }, `${this.policy.label} request failed`);
      }
      throw new AppError(this.policy.fallbackErrorCode, {}, error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async fetchWithRetry(
    url: string,
    fetchOptions: ProviderFetchInit,
    signal: AbortSignal
  ): Promise<Response> {
    const doFetch = () => {
      // URL validée par `normalizeServerUrl` dans la politique : la cible est
      // le serveur configuré par l'utilisateur, auto-hébergé par nature.
      // codeql[js/request-forgery]
      return fetch(url, { ...fetchOptions, signal });
    };

    try {
      return await doFetch();
    } catch (error) {
      const retry = this.policy.retry;
      if (!retry?.shouldRetry(error)) throw error;

      retry.beforeRetry?.(error, url);
      if (retry.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, retry.delayMs));
      }
      // codeql[js/request-forgery]
      return doFetch();
    }
  }
}
