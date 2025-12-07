import { useTranslate } from "@/hooks/useTranslate";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Shield } from "lucide-react";
import { SliderControl } from "@/components/ui/slider-control";
import logger from "@/lib/logger";

export function AdvancedSettings() {
  const { t } = useTranslate();
  const { toast } = useToast();
  const { preferences, updatePreferences } = usePreferences();

  const handleMaxConcurrentChange = async (value: number) => {
    try {
      await updatePreferences({
        komgaMaxConcurrentRequests: value,
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

  const handleCircuitBreakerChange = async (field: string, value: number) => {
    try {
      await updatePreferences({
        circuitBreakerConfig: {
          ...preferences.circuitBreakerConfig,
          [field]: value,
        },
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
            label={t("settings.advanced.maxConcurrentRequests.label")}
            value={preferences.komgaMaxConcurrentRequests}
            min={1}
            max={10}
            step={1}
            description={t("settings.advanced.maxConcurrentRequests.description")}
            onChange={handleMaxConcurrentChange}
          />

          <div className="border-t" />

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

      {/* Circuit Breaker Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t("settings.advanced.circuitBreaker.title")}</CardTitle>
          </div>
          <CardDescription>{t("settings.advanced.circuitBreaker.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SliderControl
            label={t("settings.advanced.circuitBreaker.threshold.label")}
            value={preferences.circuitBreakerConfig.threshold ?? 5}
            min={1}
            max={20}
            step={1}
            description={t("settings.advanced.circuitBreaker.threshold.description")}
            onChange={(value) => handleCircuitBreakerChange("threshold", value)}
          />

          <div className="border-t" />

          <SliderControl
            label={t("settings.advanced.circuitBreaker.timeout.label")}
            value={preferences.circuitBreakerConfig.timeout ?? 30000}
            min={1000}
            max={120000}
            step={1000}
            description={t("settings.advanced.circuitBreaker.timeout.description")}
            onChange={(value) => handleCircuitBreakerChange("timeout", value)}
            formatValue={(value) => `${value / 1000}s`}
          />

          <div className="border-t" />

          <SliderControl
            label={t("settings.advanced.circuitBreaker.resetTimeout.label")}
            value={preferences.circuitBreakerConfig.resetTimeout ?? 60000}
            min={10000}
            max={600000}
            step={1000}
            description={t("settings.advanced.circuitBreaker.resetTimeout.description")}
            onChange={(value) => handleCircuitBreakerChange("resetTimeout", value)}
            formatValue={(value) => `${value / 1000}s`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
