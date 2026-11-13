"use server";

import {
  AdminService,
  ASSIGNABLE_ROLES,
  type AdminStatsData,
  type AdminUserData,
} from "@/lib/services/admin.service";
import { AuthServerService } from "@/lib/services/auth-server.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ActionError, runAction, type ActionResult } from "@/lib/actions/action-runner";

/** Réinitialisations de mot de passe par administrateur et par fenêtre. */
const RESET_PASSWORD_RATE_LIMIT = { limit: 10, windowMs: 15 * 60_000 };

const isAssignableRole = (role: string): boolean =>
  (ASSIGNABLE_ROLES as readonly string[]).includes(role);

export async function getAdminDashboardData(): Promise<
  ActionResult<{ users: AdminUserData[]; stats: AdminStatsData }>
> {
  return runAction({
    name: "getAdminDashboardData",
    fallbackCode: ERROR_CODES.ADMIN.FETCH_USERS_ERROR,
    requireRole: "admin",
    execute: async () => {
      const [users, stats] = await Promise.all([
        AdminService.getAllUsers(),
        AdminService.getUserStats(),
      ]);
      return { message: "Données admin récupérées", users, stats };
    },
  });
}

/**
 * Met à jour les rôles d'un utilisateur
 */
export async function updateUserRoles(userId: string, roles: string[]): Promise<ActionResult> {
  return runAction({
    name: "updateUserRoles",
    fallbackCode: ERROR_CODES.ADMIN.UPDATE_USER_ERROR,
    logContext: { userId, roles },
    requireRole: "admin",
    guard: () => {
      if (roles.length === 0 || !roles.every(isAssignableRole)) {
        throw new ActionError(ERROR_CODES.ADMIN.INVALID_ROLES);
      }
    },
    execute: async ({ userId: actorId }) => {
      await AdminService.updateUserRoles(actorId, userId, roles);
      return { message: "Rôles mis à jour" };
    },
  });
}

/**
 * Supprime un utilisateur
 */
export async function deleteUser(userId: string): Promise<ActionResult> {
  return runAction({
    name: "deleteUser",
    fallbackCode: ERROR_CODES.ADMIN.DELETE_USER_ERROR,
    logContext: { userId },
    requireRole: "admin",
    execute: async ({ userId: actorId }) => {
      await AdminService.deleteUser(actorId, userId);
      return { message: "Utilisateur supprimé" };
    },
  });
}

/**
 * Réinitialise le mot de passe d'un utilisateur
 */
export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<ActionResult> {
  return runAction({
    name: "resetUserPassword",
    fallbackCode: ERROR_CODES.ADMIN.RESET_PASSWORD_ERROR,
    logContext: { userId },
    requireRole: "admin",
    rateLimit: {
      key: ({ userId: actorId }) => `admin-reset-password:${actorId}`,
      ...RESET_PASSWORD_RATE_LIMIT,
    },
    guard: () => {
      if (!AuthServerService.isPasswordStrong(newPassword)) {
        throw new ActionError(ERROR_CODES.AUTH.PASSWORD_NOT_STRONG);
      }
    },
    execute: async ({ userId: actorId }) => {
      await AdminService.resetUserPassword(actorId, userId, newPassword);
      return { message: "Mot de passe réinitialisé" };
    },
  });
}
