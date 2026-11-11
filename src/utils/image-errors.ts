import { AppError } from "./errors";

/**
 * Helper pour trouver le status HTTP dans la chaîne d'erreurs imbriquées.
 * Les services média emballent parfois une erreur IMAGE.FETCH_ERROR dans une
 * erreur métier (BOOK.PAGES_FETCH_ERROR, SERIES.FETCH_ERROR) : le status reste
 * dans les paramètres, on le remonte pour distinguer un vrai 404.
 */
export function findHttpStatus(error: unknown): number | null {
  if (!(error instanceof AppError)) return null;

  const params = error.params as { status?: number } | undefined;
  if (typeof params?.status === "number") return params.status;

  if (error.originalError) {
    return findHttpStatus(error.originalError);
  }

  return null;
}
