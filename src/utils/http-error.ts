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
