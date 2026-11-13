import { ERROR_MESSAGES } from "../constants/errorMessages";
import type { ErrorCode } from "../constants/errorCodes";

/**
 * Interpole les paramètres dans le message technique d'un code d'erreur.
 *
 * Un paramètre absent laisse son gabarit `{clé}` intact (utile dans les logs),
 * et un code inconnu à l'exécution se replie sur le code lui-même plutôt que
 * de produire `undefined` : un message manquant ne doit jamais casser le
 * chemin d'erreur.
 */
export const getErrorMessage = (
  code: ErrorCode,
  params: Record<string, string | number> = {}
): string => {
  const template = ERROR_MESSAGES[code] ?? code;

  return Object.entries(params).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template
  );
};

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public params: Record<string, string | number> = {},
    public originalError?: unknown
  ) {
    super(getErrorMessage(code, params));
    this.name = "AppError";
  }
}
