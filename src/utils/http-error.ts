import type { ErrorCode } from "@/constants/errorCodes";

interface ProviderHttpCodes {
  UNAUTHORIZED: ErrorCode;
  FORBIDDEN: ErrorCode;
  NOT_FOUND: ErrorCode;
  SERVER_ERROR: ErrorCode;
  HTTP_ERROR: ErrorCode;
}

/**
 * Mappe un status HTTP vers le code d'erreur le plus spécifique disponible
 * pour un provider donné. Permet d'afficher un message UX adapté plutôt
 * qu'un message HTTP générique.
 */
export function codeForHttpStatus(status: number, codes: ProviderHttpCodes): ErrorCode {
  if (status === 401) return codes.UNAUTHORIZED;
  if (status === 403) return codes.FORBIDDEN;
  if (status === 404) return codes.NOT_FOUND;
  if (status >= 500) return codes.SERVER_ERROR;
  return codes.HTTP_ERROR;
}

const CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
]);

/**
 * Détecte une erreur réseau (provider down, DNS KO, socket fermé). Utile pour
 * baisser le niveau de log à `warn` et ne pas spammer en `error` quand un
 * provider externe est juste injoignable.
 */
export function isConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; cause?: unknown; originalError?: unknown; message?: string };
  if (e.code && CONNECTION_ERROR_CODES.has(e.code)) return true;
  if (typeof e.message === "string" && /fetch failed/i.test(e.message)) return true;
  if (e.cause && isConnectionError(e.cause)) return true;
  if (e.originalError && isConnectionError(e.originalError)) return true;
  return false;
}
