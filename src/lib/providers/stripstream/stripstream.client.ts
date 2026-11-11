import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import { codeForHttpStatus, isConnectionError } from "@/utils/http-error";
import logger from "@/lib/logger";

import {
  ProviderTransport,
  type ProviderQueryParams,
  type ProviderRequestOptions,
} from "../provider-transport";
import {
  createStripstreamTransportPolicy,
  STRIPSTREAM_HTTP_CODES,
} from "./stripstream.transport-policy";

const IMAGE_TIMEOUT_MS = 60000;

/**
 * Seul point de construction du client média. Le provider et le transport
 * passent par ici pour garder l'URL, le token et les délais au même endroit.
 */
export function createStripstreamClient(url: string, token: string): StripstreamClient {
  return new StripstreamClient(url, token);
}

export class StripstreamClient {
  private transport: ProviderTransport;

  constructor(url: string, token: string) {
    this.transport = new ProviderTransport(createStripstreamTransportPolicy(url, token));
  }

  buildUrl(path: string, params?: ProviderQueryParams): string {
    return this.transport.buildUrl(path, params);
  }

  async fetch<T>(
    path: string,
    params?: ProviderQueryParams,
    options: ProviderRequestOptions = {}
  ): Promise<T> {
    return this.transport.request<T>(path, params, options);
  }

  async fetchImage(
    path: string,
    conditionalHeaders?: HeadersInit,
    timeoutMs: number = IMAGE_TIMEOUT_MS
  ): Promise<Response> {
    const url = this.buildUrl(path);
    const headers = this.transport.buildHeaders({
      accept: "image/webp, image/jpeg, image/png, */*",
    });
    if (conditionalHeaders) {
      const requestHeaders = new Headers(conditionalHeaders);
      for (const header of ["if-none-match", "if-modified-since"]) {
        const value = requestHeaders.get(header);
        if (value) headers.set(header, value);
      }
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
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

  /**
   * Open a stream on the original source file (`books/{id}/file`). The body is
   * forwarded untouched by the route handler, so this only needs to surface a
   * status-aware `AppError` (404 when the file row or the disk file is missing).
   */
  async fetchFile(path: string): Promise<Response> {
    const url = this.buildUrl(path);
    const headers = this.transport.buildHeaders({
      accept: "application/octet-stream, */*",
    });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    try {
      const response = await fetch(url, { headers, signal: controller.signal, cache: "no-store" });
      if (!response.ok) {
        throw new AppError(codeForHttpStatus(response.status, STRIPSTREAM_HTTP_CODES), {
          status: response.status,
          statusText: response.statusText,
        });
      }
      return response;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (isConnectionError(error)) {
        logger.warn({ err: error, url }, "Stripstream file request failed");
      } else {
        logger.error({ err: error, url }, "Stripstream file request failed");
      }
      throw new AppError(ERROR_CODES.STRIPSTREAM.CONNECTION_ERROR, {}, error);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
