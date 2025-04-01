import { usePreferences } from "@/contexts/PreferencesContext";

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
      console.error("Erreur lors de la mise à jour du mode compact:", error);
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
      console.error("Erreur lors de la mise à jour de la taille de page:", error);
    }
  };

  return {
    isCompact: preferences.displayMode.compact,
    itemsPerPage: preferences.displayMode.itemsPerPage,
    handleCompactToggle,
    handlePageSizeChange,
  };
}
