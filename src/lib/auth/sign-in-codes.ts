import { ERROR_CODES, type ErrorCode } from "@/constants/errorCodes";

/**
 * Codes que `authorize` expose au client via `signIn(...).code` (le paramètre
 * `code` de NextAuth). Ils voyagent dans l'URL : ne jamais y mettre un détail
 * qui distinguerait un compte existant d'un compte inconnu.
 */
export const SIGN_IN_CODES = {
  rateLimited: "rate_limited",
} as const;

/** Code d'erreur applicatif à afficher pour un échec de `signIn("credentials")`. */
export function signInErrorCode(code: string | undefined): ErrorCode {
  return code === SIGN_IN_CODES.rateLimited
    ? ERROR_CODES.AUTH.RATE_LIMITED
    : ERROR_CODES.AUTH.INVALID_CREDENTIALS;
}
