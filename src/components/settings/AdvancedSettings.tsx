import { useTranslate } from "@/hooks/useTranslate";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { SliderControl } from "@/components/ui/slider-control";
import logger from "@/lib/logger";

export function AdvancedSettings() {
  const { t } = useTranslate();
  const { toast } = useToast();
  const { preferences, updatePreferences } = usePreferences();

  const handlePrefetchChange = async (value: number) => {
    try {
      await updatePreferences({
        readerPrefetchCount: value,
      });
      toast({
        title: t("settings.title"),
        description: t("settings.komga.messages.configSaved"),
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur:");
      toast({
        variant: "destructive",
        title: t("settings.error.title"),
        description: t("settings.error.message"),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Performance</CardTitle>
          </div>
          <CardDescription>
            Optimisez les performances et la réactivité de l'application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SliderControl
            label={t("settings.advanced.prefetchCount.label")}
            value={preferences.readerPrefetchCount}
            min={0}
            max={20}
            step={1}
            description={t("settings.advanced.prefetchCount.description")}
            onChange={handlePrefetchChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
