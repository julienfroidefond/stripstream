import { useTranslate } from "@/hooks/useTranslate";
import { usePreferences } from "@/contexts/PreferencesContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.display.title")}</CardTitle>
        <CardDescription>{t("settings.display.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}
