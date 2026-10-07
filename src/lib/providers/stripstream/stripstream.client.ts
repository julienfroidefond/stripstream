import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import { codeForHttpStatus, isConnectionError } from "@/utils/http-error";
import logger from "@/lib/logger";

const STRIPSTREAM_HTTP_CODES = {
  UNAUTHORIZED: ERROR_CODES.STRIPSTREAM.UNAUTHORIZED,
  FORBIDDEN: ERROR_CODES.STRIPSTREAM.FORBIDDEN,
  NOT_FOUND: ERROR_CODES.STRIPSTREAM.NOT_FOUND,
  SERVER_ERROR: ERROR_CODES.STRIPSTREAM.SERVER_ERROR,
  HTTP_ERROR: ERROR_CODES.STRIPSTREAM.HTTP_ERROR,
};

const TIMEOUT_MS = 15000;
const IMAGE_TIMEOUT_MS = 60000;

interface FetchErrorLike { code?: string; cause?: { code?: string } }

interface FetchOptions extends RequestInit {
  revalidate?: number;
  tags?: string[];
}

const RETRYABLE_CODES = new Set([
  "EAI_AGAIN",    // DNS transient failure
  "ENOTFOUND",    // DNS resolution failure (Docker restart)
  "ECONNRESET",   // socket closed mid-request (rolling restart)
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
]);

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as FetchErrorLike;
  if (e.code && RETRYABLE_CODES.has(e.code)) return true;
  if (e.cause?.code && RETRYABLE_CODES.has(e.cause.code)) return true;
  return false;
}

export class StripstreamClient {
  private baseUrl: string;
  private token: string;

  constructor(url: string, token: string) {
    // Trim trailing slash
    this.baseUrl = url.replace(/\/$/, "");
    this.token = token;
  }

  private getHeaders(extra: Record<string, string> = {}): Headers {
    return new Headers({
      Authorization: `Bearer ${this.token}`,
      Accept: "application/json",
      ...extra,
    });
  }

  buildUrl(path: string, params?: Record<string, string | undefined>): string {
    const url = new URL(`${this.baseUrl}/${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) url.searchParams.append(k, v);
      });
    }
    return url.toString();
  }

  async fetch<T>(
    path: string,
    params?: Record<string, string | undefined>,
    options: FetchOptions = {}
  ): Promise<T> {
    const url = this.buildUrl(path, params);
    const headers = this.getHeaders(
      options.body ? { "Content-Type": "application/json" } : {}
    );

    const isDebug = process.env.STRIPSTREAM_DEBUG === "true";
    const isCacheDebug = process.env.CACHE_DEBUG === "true";
    const startTime = isDebug ? Date.now() : 0;

    if (isDebug) {
      logger.info(
        { url, method: options.method || "GET", params, revalidate: options.revalidate },
        "🔵 Stripstream Request"
      );
    }
    if (isCacheDebug) {
      if (options.tags) {
        logger.info({ url, cache: "tags", tags: options.tags }, "💾 Cache tags");
      } else if (options.revalidate !== undefined) {
        logger.info({ url, cache: "revalidate", ttl: options.revalidate }, "💾 Cache revalidate");
      } else {
        logger.info({ url, cache: "none" }, "💾 Cache none");
      }
    }

    const nextOptions = options.tags
      ? { tags: options.tags }
      : options.revalidate !== undefined
        ? { revalidate: options.revalidate }
        : undefined;

    const fetchOptions = {
      headers,
      ...options,
      next: nextOptions,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const doFetch = async () => {
      try {
        return await fetch(url, { ...fetchOptions, signal: controller.signal });
      } catch (err: unknown) {
        if (isRetryable(err)) {
          logger.warn({ err, url }, "Transient network error, retrying...");
          await new Promise((r) => setTimeout(r, 500));
          return fetch(url, { ...fetchOptions, signal: controller.signal });
        }
        throw err;
      }
    };

    try {
      const response = await doFetch();
      clearTimeout(timeoutId);

      if (isDebug) {
        const duration = Date.now() - startTime;
        logger.info(
          { url, status: response.status, duration: `${duration}ms`, ok: response.ok },
          "🟢 Stripstream Response"
        );
      }

      if (!response.ok) {
        if (isDebug) {
          logger.error(
            { url, status: response.status, statusText: response.statusText },
            "🔴 Stripstream Error Response"
          );
        }
        throw new AppError(codeForHttpStatus(response.status, STRIPSTREAM_HTTP_CODES), {
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
          { url, error: error instanceof Error ? error.message : String(error), duration: `${Date.now() - startTime}ms` },
          "🔴 Stripstream Request Failed"
        );
      }
      if (error instanceof AppError) throw error;
      // Provider injoignable (DNS, socket, refus) → warn pour ne pas spammer le log :
      // l'AppError remontée sera de toute façon loggée par les couches appelantes.
      if (isConnectionError(error)) {
        logger.warn({ err: error, url }, "Stripstream request failed");
      } else {
        logger.error({ err: error, url }, "Stripstream request failed");
      }
      throw new AppError(ERROR_CODES.STRIPSTREAM.CONNECTION_ERROR, {}, error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async fetchImage(path: string, conditionalHeaders?: HeadersInit): Promise<Response> {
    const url = this.buildUrl(path);
    const headers = new Headers({
      Authorization: `Bearer ${this.token}`,
      Accept: "image/webp, image/jpeg, image/png, */*",
    });
    if (conditionalHeaders) {
      const requestHeaders = new Headers(conditionalHeaders);
      for (const header of ["if-none-match", "if-modified-since"]) {
        const value = requestHeaders.get(header);
        if (value) headers.set(header, value);
      }
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    try {
      const response = await fetch(url, { headers, signal: controller.signal });
      if (!response.ok && response.status !== 304) {
        throw new AppError(ERROR_CODES.IMAGE.FETCH_ERROR, { status: response.status });
      }
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
