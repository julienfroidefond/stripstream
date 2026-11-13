"use server";

import { UserService } from "@/lib/services/user.service";
import { AuthServerService } from "@/lib/services/auth-server.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ActionError, runAction, type ActionResult } from "@/lib/actions/action-runner";

/**
 * Budget de changements de mot de passe par utilisateur : chaque tentative
 * compare l'ancien mot de passe avec bcrypt, c'est donc un oracle à freiner.
 */
const CHANGE_PASSWORD_RATE_LIMIT = { limit: 5, windowMs: 15 * 60_000 };

/**
 * Change le mot de passe de l'utilisateur
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  return runAction({
    name: "changePassword",
    fallbackCode: ERROR_CODES.AUTH.PASSWORD_CHANGE_ERROR,
    requireUser: true,
    rateLimit: {
      key: ({ userId }) => `change-password:${userId}`,
      ...CHANGE_PASSWORD_RATE_LIMIT,
    },
    guard: () => {
      if (!AuthServerService.isPasswordStrong(newPassword)) {
        throw new ActionError(ERROR_CODES.AUTH.PASSWORD_NOT_STRONG);
      }
    },
    execute: async ({ userId }) => {
      await UserService.changePassword(userId, currentPassword, newPassword);
      return { message: "Mot de passe modifié avec succès" };
    },
  });
}
