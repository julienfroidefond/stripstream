"use server";

import { UserService } from "@/lib/services/user.service";
import { AuthServerService } from "@/lib/services/auth-server.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";

/**
 * Change le mot de passe de l'utilisateur
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Vérifier que le nouveau mot de passe est fort
    if (!AuthServerService.isPasswordStrong(newPassword)) {
      return {
        success: false,
        message: "Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre",
      };
    }

    await UserService.changePassword(currentPassword, newPassword);

    return { success: true, message: "Mot de passe modifié avec succès" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors du changement de mot de passe" };
  }
}
