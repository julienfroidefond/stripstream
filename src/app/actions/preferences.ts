"use server";

import { invalidatePreferences } from "@/lib/cache/invalidation";
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
    // Le mode anonyme est piloté immédiatement par le contexte client. Une
    // revalidation ici pourrait réinjecter pendant la transition les
    // préférences initiales de la page et faire clignoter le bouton à l'état
    // précédent.
    invalidate: anonymousOnly ? undefined : invalidatePreferences,
    execute: async () => ({
      message: "Préférences mises à jour",
      data: await PreferencesService.updatePreferences(newPreferences),
    }),
  });
}
