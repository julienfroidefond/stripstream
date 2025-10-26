import { useTranslate } from "@/hooks/useTranslate";
import { usePreferences } from "@/contexts/PreferencesContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, ImageIcon, Shield, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
          {/* Concurrent Requests */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="maxConcurrentRequests" className="text-base">
                    {t("settings.advanced.maxConcurrentRequests.label")}
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    {preferences.komgaMaxConcurrentRequests}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("settings.advanced.maxConcurrentRequests.description")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Input
                id="maxConcurrentRequests"
                type="range"
                min="1"
                max="10"
                value={preferences.komgaMaxConcurrentRequests}
                onChange={(e) => handleMaxConcurrentChange(parseInt(e.target.value))}
                className="flex-1 cursor-pointer"
              />
              <Input
                type="number"
                min="1"
                max="10"
                value={preferences.komgaMaxConcurrentRequests}
                onChange={(e) => handleMaxConcurrentChange(parseInt(e.target.value) || 1)}
                className="w-20"
              />
            </div>
          </div>

          <div className="border-t" />

          {/* Reader Prefetch Count */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="prefetchCount" className="text-base">
                    {t("settings.advanced.prefetchCount.label")}
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    {preferences.readerPrefetchCount}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("settings.advanced.prefetchCount.description")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Input
                id="prefetchCount"
                type="range"
                min="0"
                max="20"
                value={preferences.readerPrefetchCount}
                onChange={(e) => handlePrefetchChange(parseInt(e.target.value))}
                className="flex-1 cursor-pointer"
              />
              <Input
                type="number"
                min="0"
                max="20"
                value={preferences.readerPrefetchCount}
                onChange={(e) => handlePrefetchChange(parseInt(e.target.value) || 0)}
                className="w-20"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Circuit Breaker Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t("settings.advanced.circuitBreaker.title")}</CardTitle>
          </div>
          <CardDescription>
            {t("settings.advanced.circuitBreaker.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Threshold */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="cbThreshold" className="text-base">
                    {t("settings.advanced.circuitBreaker.threshold.label")}
                  </Label>
                  <Badge variant="destructive" className="text-xs">
                    {preferences.circuitBreakerConfig.threshold}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("settings.advanced.circuitBreaker.threshold.description")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Input
                id="cbThreshold"
                type="range"
                min="1"
                max="20"
                value={preferences.circuitBreakerConfig.threshold}
                onChange={(e) =>
                  handleCircuitBreakerChange("threshold", parseInt(e.target.value))
                }
                className="flex-1 cursor-pointer"
              />
              <Input
                type="number"
                min="1"
                max="20"
                value={preferences.circuitBreakerConfig.threshold}
                onChange={(e) =>
                  handleCircuitBreakerChange("threshold", parseInt(e.target.value) || 5)
                }
                className="w-20"
              />
            </div>
          </div>

          <div className="border-t" />

          {/* Timeout */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="cbTimeout" className="text-base">
                    {t("settings.advanced.circuitBreaker.timeout.label")}
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    {(preferences.circuitBreakerConfig.timeout ?? 30000) / 1000}s
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("settings.advanced.circuitBreaker.timeout.description")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Input
                id="cbTimeout"
                type="range"
                min="1000"
                max="120000"
                step="1000"
                value={preferences.circuitBreakerConfig.timeout}
                onChange={(e) =>
                  handleCircuitBreakerChange("timeout", parseInt(e.target.value))
                }
                className="flex-1 cursor-pointer"
              />
              <Input
                type="number"
                min="1"
                max="120"
                value={(preferences.circuitBreakerConfig.timeout ?? 30000) / 1000}
                onChange={(e) =>
                  handleCircuitBreakerChange("timeout", (parseInt(e.target.value) || 30) * 1000)
                }
                className="w-20"
              />
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>{t("settings.advanced.circuitBreaker.timeout.unit")}</span>
            </div>
          </div>

          <div className="border-t" />

          {/* Reset Timeout */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="cbResetTimeout" className="text-base">
                    {t("settings.advanced.circuitBreaker.resetTimeout.label")}
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    {(preferences.circuitBreakerConfig.resetTimeout ?? 60000) / 1000}s
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("settings.advanced.circuitBreaker.resetTimeout.description")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Input
                id="cbResetTimeout"
                type="range"
                min="10000"
                max="600000"
                step="1000"
                value={preferences.circuitBreakerConfig.resetTimeout ?? 60000}
                onChange={(e) =>
                  handleCircuitBreakerChange("resetTimeout", parseInt(e.target.value))
                }
                className="flex-1 cursor-pointer"
              />
              <Input
                type="number"
                min="10"
                max="600"
                value={(preferences.circuitBreakerConfig.resetTimeout ?? 60000) / 1000}
                onChange={(e) =>
                  handleCircuitBreakerChange("resetTimeout", (parseInt(e.target.value) || 60) * 1000)
                }
                className="w-20"
              />
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>{t("settings.advanced.circuitBreaker.resetTimeout.unit")}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
