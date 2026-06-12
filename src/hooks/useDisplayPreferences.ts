import { usePreferences } from "@/contexts/PreferencesContext";
import logger from "@/lib/logger";
import { normalizeGridPageSize } from "@/lib/pageSize";

export function useDisplayPreferences() {
  const { preferences, updatePreferences } = usePreferences();

  const handleCompactToggle = async (checked: boolean) => {
    try {
      const itemsPerPage = normalizeGridPageSize(preferences.displayMode.itemsPerPage, checked);

      await updatePreferences({
        displayMode: {
          ...preferences.displayMode,
          compact: checked,
          itemsPerPage,
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la mise à jour du mode compact");
    }
  };

  const handlePageSizeChange = async (size: number) => {
    try {
      await updatePreferences({
        displayMode: {
          ...preferences.displayMode,
          itemsPerPage: normalizeGridPageSize(size, preferences.displayMode.compact),
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la mise à jour de la taille de page");
    }
  };

  const handleViewModeToggle = async (viewMode: "grid" | "list") => {
    try {
      await updatePreferences({
        displayMode: {
          ...preferences.displayMode,
          viewMode,
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la mise à jour du mode d'affichage");
    }
  };

  return {
    isCompact: preferences.displayMode.compact,
    itemsPerPage: normalizeGridPageSize(
      preferences.displayMode.itemsPerPage,
      preferences.displayMode.compact
    ),
    viewMode: preferences.displayMode.viewMode || "grid",
    handleCompactToggle,
    handlePageSizeChange,
    handleViewModeToggle,
  };
}
