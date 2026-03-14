import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import logger from "@/lib/logger";

const TIMEOUT_MS = 15000;
const IMAGE_TIMEOUT_MS = 60000;

interface FetchErrorLike { code?: string; cause?: { code?: string } }

interface FetchOptions extends RequestInit {
  revalidate?: number;
  tags?: string[];
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
        const e = err as FetchErrorLike;
        if (e.cause?.code === "EAI_AGAIN" || e.code === "EAI_AGAIN") {
          logger.error(`DNS resolution failed for ${url}, retrying...`);
          return fetch(url, { ...fetchOptions, signal: controller.signal });
        }
        if (e.cause?.code === "UND_ERR_CONNECT_TIMEOUT") {
          logger.info(`⏱️ Connection timeout for ${url}, retrying (cold start)...`);
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
        throw new AppError(ERROR_CODES.STRIPSTREAM.HTTP_ERROR, {
          status: response.status,
          statusText: response.statusText,
        });
      }

      return response.json();
    } catch (error) {
      if (isDebug) {
        logger.error(
          { url, error: error instanceof Error ? error.message : String(error), duration: `${Date.now() - startTime}ms` },
          "🔴 Stripstream Request Failed"
        );
      }
      if (error instanceof AppError) throw error;
      logger.error({ err: error, url }, "Stripstream request failed");
      throw new AppError(ERROR_CODES.STRIPSTREAM.CONNECTION_ERROR, {}, error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async fetchImage(path: string): Promise<Response> {
    const url = this.buildUrl(path);
    const headers = new Headers({
      Authorization: `Bearer ${this.token}`,
      Accept: "image/webp, image/jpeg, image/png, */*",
    });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    try {
      const response = await fetch(url, { headers, signal: controller.signal });
      if (!response.ok) {
        throw new AppError(ERROR_CODES.IMAGE.FETCH_ERROR, { status: response.status });
      }
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
