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

export interface ProviderResponseOptions {
  /** Overrides the policy Accept header (images, files). */
  accept?: string;
  /** Relays only `If-None-Match` / `If-Modified-Since`. */
  conditionalHeaders?: HeadersInit;
  /** Overrides the policy timeout for this stream. */
  timeoutMs?: number;
  cache?: RequestCache;
  /** 304 is a successful media response, not an error. */
  allowNotModified?: boolean;
  /** Maps every HTTP/network failure to this code instead of the policy table. */
  errorCode?: ErrorCode;
}

const CONDITIONAL_HEADERS = ["if-none-match", "if-modified-since"] as const;

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
  /**
   * Vérifie, avant chaque requête, que l'hôte résout toujours vers une adresse
   * autorisée (DNS rebinding). Lève une `AppError` qui remonte telle quelle.
   */
  assertTarget?(url: string): Promise<void>;
}

interface ProviderFetchInit extends RequestInit {
  next?: { revalidate?: number; tags?: string[] };
}

export function errorCodeOf(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code ?? candidate.cause?.code;
}

const DOT_SEGMENT = /^(?:\.|%2e){1,2}$/i;

/**
 * Un chemin provider est une suite de segments littéraux : pas de query ni de
 * fragment (ils passent par `params`), pas d'antislash, pas de segment `.`/`..`
 * (y compris encodé), que le parseur WHATWG résoudrait.
 */
export function isSafeProviderPath(path: string): boolean {
  if (/[?#\\]/.test(path)) return false;
  return path.split("/").every((segment) => !DOT_SEGMENT.test(segment));
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
    if (!isSafeProviderPath(cleanPath)) {
      // Un id venu d'une route ou d'une action est déjà décodé par Next :
      // `..%2F` y devient `../`, que `new URL()` résoudrait hors du préfixe
      // API. On refuse plutôt que d'envoyer les identifiants ailleurs.
      throw new AppError(this.policy.httpCodes.NOT_FOUND, { status: 404 });
    }
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
    await this.policy.assertTarget?.(url);
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
        logger.info({ url, cache: "tags", tags, ttl: revalidate }, "Cache tags");
      } else if (revalidate !== undefined) {
        logger.info({ url, cache: "revalidate", ttl: revalidate }, "Cache revalidate");
      } else {
        logger.info({ url, cache: "none" }, "Cache none");
      }
    }

    // Le TTL et les tags se cumulent : les tags permettent l'invalidation
    // ciblée après une mutation, le TTL borne la fraîcheur des lectures
    // qu'aucune mutation locale n'invalide (changements faits côté backend).
    const nextOptions =
      tags || revalidate !== undefined
        ? {
            ...(revalidate !== undefined ? { revalidate } : {}),
            ...(tags ? { tags } : {}),
          }
        : undefined;
    const fetchOptions: ProviderFetchInit = {
      ...requestInit,
      headers,
      next: nextOptions,
      // Jamais de redirection suivie : l'URL validée (`normalizeServerUrl` +
      // IP résolue) est la seule cible, un 3xx devient une erreur HTTP.
      redirect: "manual",
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

  /**
   * Ouvre une réponse provider brute (image, fichier) sans la parser en JSON.
   * Même politique d'URL, d'auth, de timeout et de mapping d'erreurs que
   * `request()`, mais le corps reste un flux : l'appelant décide de le bufferiser
   * (déduplication) ou de le relayer tel quel.
   */
  async response(
    path: string,
    params?: ProviderQueryParams,
    options: ProviderResponseOptions = {}
  ): Promise<Response> {
    const url = this.buildUrl(path, params);
    await this.policy.assertTarget?.(url);
    const headers = this.buildHeaders({ accept: options.accept });
    if (options.conditionalHeaders) {
      const validators = new Headers(options.conditionalHeaders);
      for (const name of CONDITIONAL_HEADERS) {
        const value = validators.get(name);
        if (value) headers.set(name, value);
      }
    }

    const isDebug = this.policy.debugRequest?.() ?? false;
    const startTime = isDebug ? Date.now() : 0;
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? this.policy.timeoutMs;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // codeql[js/request-forgery]
      const response = await fetch(url, {
        headers,
        cache: options.cache,
        signal: controller.signal,
        // Comme `request()` : un 3xx (hors 304 autorisé) est une erreur, pas un
        // saut vers un hôte que la validation de l'URL n'a jamais vu.
        redirect: "manual",
      });

      if (isDebug) {
        logger.info(
          {
            url,
            status: response.status,
            duration: `${Date.now() - startTime}ms`,
            ok: response.ok,
          },
          `${this.policy.label} Stream Response`
        );
      }

      const notModified = options.allowNotModified && response.status === 304;
      if (!response.ok && !notModified) {
        if (isDebug) {
          logger.error(
            { url, status: response.status, statusText: response.statusText },
            `${this.policy.label} Stream Error Response`
          );
        }
        throw new AppError(
          options.errorCode ?? codeForHttpStatus(response.status, this.policy.httpCodes),
          { status: response.status, statusText: response.statusText }
        );
      }

      return response;
    } catch (error) {
      if (isDebug) {
        logger.error(
          {
            url,
            error: error instanceof Error ? error.message : String(error),
            duration: `${Date.now() - startTime}ms`,
          },
          `${this.policy.label} Stream Failed`
        );
      }
      if (error instanceof AppError) throw error;
      if (isConnectionError(error)) {
        logger.warn({ err: error, url }, `${this.policy.label} stream failed`);
      } else {
        logger.error({ err: error, url }, `${this.policy.label} stream failed`);
      }
      throw new AppError(options.errorCode ?? this.policy.fallbackErrorCode, {}, error);
    } finally {
      clearTimeout(timeoutId);
    }
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
