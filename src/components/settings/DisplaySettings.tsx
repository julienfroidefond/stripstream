import { useTranslate } from "@/hooks/useTranslate";
import { usePreferences } from "@/contexts/PreferencesContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export function DisplaySettings() {
  const { t } = useTranslate();
  const { toast } = useToast();
  const { preferences, updatePreferences } = usePreferences();

  const handleToggleThumbnails = async (checked: boolean) => {
    try {
      await updatePreferences({ showThumbnails: checked });
      toast({
        title: t("settings.title"),
        description: t("settings.komga.messages.configSaved"),
      });
    } catch (error) {
      console.error("Erreur détaillée:", error);
      toast({
        variant: "destructive",
        title: t("settings.error.title"),
        description: t("settings.error.message"),
      });
    }
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-5 space-y-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {t("settings.display.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t("settings.display.description")}</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="thumbnails">{t("settings.display.thumbnails.label")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.display.thumbnails.description")}
              </p>
            </div>
            <Switch
              id="thumbnails"
              checked={preferences.showThumbnails}
              onCheckedChange={handleToggleThumbnails}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="unread-filter">{t("settings.display.unreadFilter.label")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.display.unreadFilter.description")}
              </p>
            </div>
            <Switch
              id="unread-filter"
              checked={preferences.showOnlyUnread}
              onCheckedChange={async (checked) => {
                try {
                  await updatePreferences({ showOnlyUnread: checked });
                  toast({
                    title: t("settings.title"),
                    description: t("settings.komga.messages.configSaved"),
                  });
                } catch (error) {
                  console.error("Erreur détaillée:", error);
                  toast({
                    variant: "destructive",
                    title: t("settings.error.title"),
                    description: t("settings.error.message"),
                  });
                }
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="debug-mode">{t("settings.display.debugMode.label")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.display.debugMode.description")}
              </p>
            </div>
            <Switch
              id="debug-mode"
              checked={preferences.debug}
              onCheckedChange={async (checked) => {
                try {
                  await updatePreferences({ debug: checked });
                  toast({
                    title: t("settings.title"),
                    description: t("settings.komga.messages.configSaved"),
                  });
                } catch (error) {
                  console.error("Erreur détaillée:", error);
                  toast({
                    variant: "destructive",
                    title: t("settings.error.title"),
                    description: t("settings.error.message"),
                  });
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
