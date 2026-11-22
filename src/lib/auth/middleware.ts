import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { rolesFromToken } from "@/lib/auth/session-token";
import logger from "@/lib/logger";

/**
 * Session lue dans le jeton, pour le proxy uniquement.
 *
 * Contrat : vérifie la signature du JWT uniquement ; ne relit pas la base.
 * L'autorisation (compte supprimé, `sessionVersion`, rôles) est faite par
 * `auth()` dans les pages et par le runner d'actions. Ne pas utiliser ce
 * helper comme seule barrière d'autorisation.
 */
export async function getAuthSession(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      // Auth.js issues the `__Secure-` session cookie in production. Tell
      // getToken to look for that same cookie instead of its non-secure
      // development default.
      secureCookie: process.env.NODE_ENV === "production",
    });

    if (!token) {
      return null;
    }

    return {
      user: {
        id: token.sub!,
        email: token.email!,
        // `rolesFromToken` renvoie `[]` si le champ est absent ou corrompu :
        // un jeton signé reste une session valide, la décision de rôle est
        // prise plus loin par `auth()`.
        roles: rolesFromToken(token),
      },
    };
  } catch (error) {
    logger.error({ err: error }, "Auth error in middleware");
    return null;
  }
}
