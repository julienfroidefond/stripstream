import { normalizeGridPageSize } from "@/lib/pageSize";
import { defaultPreferences, type UserPreferences } from "@/types/preferences";

/** Complète les préférences d'affichage stockées avec les valeurs par défaut. */
export function normalizeDisplayMode(
  displayMode: Partial<UserPreferences["displayMode"]> | null | undefined
): UserPreferences["displayMode"] {
  const compact = displayMode?.compact ?? defaultPreferences.displayMode.compact;

  return {
    ...defaultPreferences.displayMode,
    ...displayMode,
    compact,
    itemsPerPage: normalizeGridPageSize(displayMode?.itemsPerPage, compact),
    viewMode: displayMode?.viewMode || defaultPreferences.displayMode.viewMode,
    booksViewMode: displayMode?.booksViewMode || defaultPreferences.displayMode.booksViewMode,
  };
}
