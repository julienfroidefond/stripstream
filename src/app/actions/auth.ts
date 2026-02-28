"use server";

import { AuthServerService } from "@/lib/services/auth-server.service";
import { AppError } from "@/utils/errors";

/**
 * Inscrit un nouvel utilisateur
 */
export async function registerUser(
  email: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  try {
    await AuthServerService.registerUser(email, password);
    return { success: true, message: "Inscription réussie" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de l'inscription" };
  }
}
