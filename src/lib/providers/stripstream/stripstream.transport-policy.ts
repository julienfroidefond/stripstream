import { ERROR_CODES } from "@/constants/errorCodes";
import logger from "@/lib/logger";
import { normalizeServerUrl } from "@/lib/connections/server-url";
import { assertProviderTargetIsSafe } from "@/lib/connections/server-url-dns";

import {
  matchesErrorCode,
  type ProviderTransportPolicy,
} from "../provider-transport";

const RETRYABLE_CODES = new Set([
  "EAI_AGAIN", // DNS transient failure
  "ENOTFOUND", // DNS resolution failure (Docker restart)
  "ECONNRESET", // socket closed mid-request (rolling restart)
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
]);

const TIMEOUT_MS = 15000;

export const STRIPSTREAM_HTTP_CODES = {
  UNAUTHORIZED: ERROR_CODES.STRIPSTREAM.UNAUTHORIZED,
  FORBIDDEN: ERROR_CODES.STRIPSTREAM.FORBIDDEN,
  NOT_FOUND: ERROR_CODES.STRIPSTREAM.NOT_FOUND,
  SERVER_ERROR: ERROR_CODES.STRIPSTREAM.SERVER_ERROR,
  HTTP_ERROR: ERROR_CODES.STRIPSTREAM.HTTP_ERROR,
} as const;

export function createStripstreamTransportPolicy(
  url: string,
  token: string
): ProviderTransportPolicy {
  return {
    label: "Stripstream",
    origin: normalizeServerUrl(url),
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    httpCodes: STRIPSTREAM_HTTP_CODES,
    assertTarget: (target) => assertProviderTargetIsSafe(target),
    timeoutMs: TIMEOUT_MS,
    fallbackErrorCode: ERROR_CODES.STRIPSTREAM.CONNECTION_ERROR,
    retry: {
      shouldRetry: (error) => matchesErrorCode(error, RETRYABLE_CODES),
      beforeRetry: (error, url) => {
        logger.warn({ err: error, url }, "Transient network error, retrying...");
      },
      delayMs: 500,
    },
    debugRequest: () => process.env.STRIPSTREAM_DEBUG === "true",
    debugCache: () => process.env.CACHE_DEBUG === "true",
  };
}
