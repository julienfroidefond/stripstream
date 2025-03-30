import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/components/ui/use-toast";
import { useTranslate } from "@/hooks/useTranslate";

export function useDisplayPreferences() {
  const { preferences, updatePreferences } = usePreferences();
  const { toast } = useToast();
  const { t } = useTranslate();

  const handleCompactToggle = async (checked: boolean) => {
    try {
      await updatePreferences({
        displayMode: {
          ...preferences.displayMode,
          compact: checked,
        },
      });
      toast({
        title: t("settings.title"),
        description: t("settings.komga.messages.configSaved"),
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du mode compact:", error);
      toast({
        variant: "destructive",
        title: t("settings.error.title"),
        description: t("settings.error.message"),
      });
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
      toast({
        title: t("settings.title"),
        description: t("settings.komga.messages.configSaved"),
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la taille de page:", error);
      toast({
        variant: "destructive",
        title: t("settings.error.title"),
        description: t("settings.error.message"),
      });
    }
  };

  return {
    isCompact: preferences.displayMode.compact,
    itemsPerPage: preferences.displayMode.itemsPerPage,
    handleCompactToggle,
    handlePageSizeChange,
  };
}
