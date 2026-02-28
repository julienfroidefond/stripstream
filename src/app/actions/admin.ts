"use server";

import { AdminService } from "@/lib/services/admin.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { AuthServerService } from "@/lib/services/auth-server.service";

/**
 * Met à jour les rôles d'un utilisateur
 */
export async function updateUserRoles(
  userId: string,
  roles: string[]
): Promise<{ success: boolean; message: string }> {
  try {
    if (roles.length === 0) {
      return { success: false, message: "L'utilisateur doit avoir au moins un rôle" };
    }

    await AdminService.updateUserRoles(userId, roles);

    return { success: true, message: "Rôles mis à jour" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la mise à jour des rôles" };
  }
}

/**
 * Supprime un utilisateur
 */
export async function deleteUser(
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await AdminService.deleteUser(userId);
    return { success: true, message: "Utilisateur supprimé" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la suppression" };
  }
}

/**
 * Réinitialise le mot de passe d'un utilisateur
 */
export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!AuthServerService.isPasswordStrong(newPassword)) {
      return {
        success: false,
        message: "Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre",
      };
    }

    await AdminService.resetUserPassword(userId, newPassword);

    return { success: true, message: "Mot de passe réinitialisé" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la réinitialisation du mot de passe" };
  }
}
