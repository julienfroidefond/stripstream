import prisma from "@/lib/prisma";
import type { LoadSessionUser } from "@/lib/auth/session-token";

/**
 * Lecture de la ligne `users` pour revalider un JWT (ADR 0032 / 0033).
 * Une recherche par clé primaire, partagée par `auth()` et le proxy.
 */
export const loadSessionUser: LoadSessionUser = (userId) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true, sessionVersion: true },
  });
