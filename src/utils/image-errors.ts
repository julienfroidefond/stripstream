import { AppError } from "./errors";
import { ERROR_CODES } from "@/constants/errorCodes";

/**
 * Helper pour trouver le status HTTP dans la chaîne d'erreurs imbriquées
 * Parcourt récursivement les originalError pour trouver une erreur KOMGA.HTTP_ERROR
 */
export function findHttpStatus(error: unknown): number | null {
  if (!(error instanceof AppError)) return null;

  // Si c'est une erreur HTTP, récupérer le status
  if (error.code === ERROR_CODES.KOMGA.HTTP_ERROR) {
    return (error.params as any)?.status || null;
  }

  // Sinon, chercher récursivement dans originalError
  if (error.originalError) {
    return findHttpStatus(error.originalError);
  }

  return null;
}
