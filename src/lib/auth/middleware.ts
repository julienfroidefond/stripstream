import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import logger from "@/lib/logger";
import { loadSessionUser } from "@/lib/auth/session-user";
import {
  revalidateSessionToken,
  rolesFromToken,
  type SessionTokenClaims,
} from "@/lib/auth/session-token";

interface ProxyToken extends SessionTokenClaims {
  email?: string | null;
}

function sessionFromToken(token: ProxyToken, roles: string[]) {
  return {
    user: {
      id: String(token.sub),
      email: token.email ?? "",
      roles,
    },
  };
}

/**
 * Lit la session Auth.js d'une requête proxifiée. Le jeton est revalidé contre
 * la base — existence du compte et `sessionVersion` — et pas seulement vérifié
 * par signature (ADR 0032 / 0033) : un jeton d'un compte supprimé, ou émis
 * avant un changement de mot de passe, est refusé ici. Ce helper reste le
 * premier rempart, pas la seule autorisation : les pages, les actions et les
 * routes revalident de toute façon via `auth()`.
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

    if (!token || !token.sub) {
      return null;
    }

    try {
      const revalidated = await revalidateSessionToken(token, loadSessionUser);
      if (!revalidated) {
        return null;
      }

      return sessionFromToken(revalidated, rolesFromToken(revalidated));
    } catch (error) {
      // Une panne de stockage (Prisma/SQLite indisponible) n'est pas une
      // session invalide : déconnecter tout le monde sur une erreur
      // transitoire serait pire que le risque résiduel. Les pages, actions et
      // routes revalident de toute façon via `auth()` et échouent normalement.
      logger.error({ err: error }, "Auth revalidation unavailable in proxy");
      return sessionFromToken(token, rolesFromToken(token));
    }
  } catch (error) {
    logger.error({ err: error }, "Auth error in middleware");
    return null;
  }
}
