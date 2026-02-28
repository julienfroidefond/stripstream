"use server";

import { revalidatePath } from "next/cache";
import { PreferencesService } from "@/lib/services/preferences.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import type { UserPreferences } from "@/types/preferences";

/**
 * Met à jour les préférences utilisateur
 */
export async function updatePreferences(
  newPreferences: Partial<UserPreferences>
): Promise<{ success: boolean; message: string; data?: UserPreferences }> {
  try {
    const updatedPreferences = await PreferencesService.updatePreferences(newPreferences);

    // Invalider les pages qui utilisent les préférences
    revalidatePath("/");
    revalidatePath("/libraries");
    revalidatePath("/series");

    return { success: true, message: "Préférences mises à jour", data: updatedPreferences };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la mise à jour des préférences" };
  }
}
