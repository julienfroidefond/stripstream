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

/** Identifiant numérique du user courant, ou `AUTH_UNAUTHENTICATED`. */
export async function requireUserId(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
  return parseInt(user.id, 10);
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.roles.includes("ROLE_ADMIN") ?? false;
}

export async function requireAdmin(): Promise<UserData> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthenticated");
  }

  if (!user.roles.includes("ROLE_ADMIN")) {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}
