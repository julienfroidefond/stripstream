import { ERROR_CODES } from "@/constants/errorCodes";
import logger from "@/lib/logger";
import { normalizeServerUrl } from "@/lib/connections/server-url";

import {
  errorCodeOf,
  matchesErrorCode,
  type ProviderTransportPolicy,
} from "../provider-transport";

const RETRYABLE_CODES = new Set([
  "EAI_AGAIN", // DNS transient failure
  "UND_ERR_CONNECT_TIMEOUT", // cold start handshake timeout
]);

const TIMEOUT_MS = 15000;

export function createKomgaTransportPolicy(
  url: string,
  authHeader: string
): ProviderTransportPolicy {
  return {
    label: "Komga",
    origin: normalizeServerUrl(url),
    pathPrefix: "/api/v1",
    headers: {
      Authorization: `Basic ${authHeader}`,
      Accept: "application/json",
    },
    httpCodes: {
      UNAUTHORIZED: ERROR_CODES.KOMGA.UNAUTHORIZED,
      FORBIDDEN: ERROR_CODES.KOMGA.FORBIDDEN,
      NOT_FOUND: ERROR_CODES.KOMGA.NOT_FOUND,
      SERVER_ERROR: ERROR_CODES.KOMGA.SERVER_ERROR,
      HTTP_ERROR: ERROR_CODES.KOMGA.HTTP_ERROR,
    },
    timeoutMs: TIMEOUT_MS,
    fallbackErrorCode: ERROR_CODES.KOMGA.CONNECTION_ERROR,
    retry: {
      shouldRetry: (error) => matchesErrorCode(error, RETRYABLE_CODES),
      beforeRetry: (error, url) => {
        if (errorCodeOf(error) === "EAI_AGAIN") {
          logger.error(`DNS resolution failed for ${url}, retrying...`);
          return;
        }
        logger.info(`⏱️ Connection timeout for ${url}, retrying (cold start)...`);
      },
    },
    cachePostWithUnstableCache: true,
    cacheKey: (url, body) => ["komga", authHeader, url, String(body ?? "")],
    debugRequest: () => process.env.KOMGA_DEBUG === "true",
    debugCache: () => process.env.CACHE_DEBUG === "true",
  };
}
