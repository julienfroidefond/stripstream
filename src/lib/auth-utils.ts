import { auth } from "@/lib/auth";
import { cache } from "react";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import type { UserData } from "@/lib/services/auth-server.service";

export const getCurrentUser = cache(async (): Promise<UserData | null> => {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    roles: session.user.roles,
    authenticated: true,
  };
});

/**
 * Identifiant numérique du user courant, ou `null` sans session.
 *
 * Seuls les points d'entrée lisent la session (runner d'actions, gateway de
 * surface, layout, route handlers, fabrique de provider) : les services
 * reçoivent cet identifiant en paramètre (ADR 0029).
 */
export async function getCurrentUserId(): Promise<number | null> {
  const user = await getCurrentUser();
  return user ? parseInt(user.id, 10) : null;
}

/** Identifiant numérique du user courant, ou `AUTH_UNAUTHENTICATED`. */
export async function requireUserId(): Promise<number> {
  const userId = await getCurrentUserId();
  if (userId === null) throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
  return userId;
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.roles.includes(ADMIN_ROLE) ?? false;
}

/** Rôle porté par les administrateurs. */
export const ADMIN_ROLE = "ROLE_ADMIN";

/**
 * Utilisateur courant s'il est administrateur. Lève `AUTH_UNAUTHENTICATED`
 * sans session et `AUTH_FORBIDDEN` sans `ROLE_ADMIN` : le runner d'actions et
 * les pages les reçoivent comme n'importe quelle `AppError`.
 *
 * Les rôles viennent de la base, pas d'un JWT figé : le callback `jwt` de
 * `@/lib/auth` relit le compte à chaque `auth()` et ferme la session d'un
 * compte supprimé ou dont le mot de passe a changé (ADR 0032).
 */
export async function requireAdmin(): Promise<UserData> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
  }

  if (!user.roles.includes(ADMIN_ROLE)) {
    throw new AppError(ERROR_CODES.AUTH.FORBIDDEN);
  }

  return user;
}
