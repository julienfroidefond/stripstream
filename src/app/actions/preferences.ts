"use server";

import { revalidatePath } from "next/cache";
import { PreferencesService } from "@/lib/services/preferences.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { runAction, type ActionResult } from "@/lib/actions/action-runner";
import type { UserPreferences } from "@/types/preferences";

/**
 * Met à jour les préférences utilisateur.
 */
export async function updatePreferences(
  newPreferences: Partial<UserPreferences>
): Promise<ActionResult<{ data: UserPreferences }>> {
  const anonymousOnly =
    Object.keys(newPreferences).length === 1 && newPreferences.anonymousMode !== undefined;

  return runAction<{ data: UserPreferences }>({
    name: "updatePreferences",
    fallbackCode: ERROR_CODES.PREFERENCES.UPDATE_ERROR,
    fallbackMessage: "Erreur lors de la mise à jour des préférences",
    logContext: { keys: Object.keys(newPreferences) },
    requireUser: true,
    // Le mode anonyme est piloté immédiatement par le contexte client. Une
    // revalidation ici pourrait réinjecter pendant la transition les
    // préférences initiales de la page et faire clignoter le bouton à l'état
    // précédent.
    invalidate: anonymousOnly
      ? undefined
      : () => {
          revalidatePath("/");
          revalidatePath("/libraries");
          revalidatePath("/series");
        },
    execute: async ({ userId }) => ({
      message: "Préférences mises à jour",
      data: await PreferencesService.updatePreferences(userId, newPreferences),
    }),
  });
}
