import { usePreferences } from "@/contexts/PreferencesContext";
import logger from "@/lib/logger";

export function useDisplayPreferences() {
  const { preferences, updatePreferences } = usePreferences();

  const handleCompactToggle = async (checked: boolean) => {
    try {
      await updatePreferences({
        displayMode: {
          ...preferences.displayMode,
          compact: checked,
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
          itemsPerPage: size,
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la mise à jour de la taille de page");
    }
  };

  return {
    isCompact: preferences.displayMode.compact,
    itemsPerPage: preferences.displayMode.itemsPerPage,
    handleCompactToggle,
    handlePageSizeChange,
  };
}
