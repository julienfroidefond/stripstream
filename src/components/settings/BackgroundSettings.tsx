"use client";

import { useState } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { usePreferences } from "@/contexts/PreferencesContext";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GRADIENT_PRESETS } from "@/types/preferences";
import type { BackgroundType } from "@/types/preferences";
import { Check } from "lucide-react";

export function BackgroundSettings() {
  const { t } = useTranslate();
  const { toast } = useToast();
  const { preferences, updatePreferences } = usePreferences();
  const [customImageUrl, setCustomImageUrl] = useState(preferences.background.imageUrl || "");

  const handleBackgroundTypeChange = async (type: BackgroundType) => {
    try {
      await updatePreferences({
        background: {
          ...preferences.background,
          type,
        },
      });
      toast({
        title: t("settings.title"),
        description: t("settings.komga.messages.configSaved"),
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        variant: "destructive",
        title: t("settings.error.title"),
        description: t("settings.error.message"),
      });
    }
  };

  const handleGradientSelect = async (gradient: string) => {
    try {
      await updatePreferences({
        background: {
          type: "gradient",
          gradient,
        },
      });
      toast({
        title: t("settings.title"),
        description: t("settings.komga.messages.configSaved"),
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        variant: "destructive",
        title: t("settings.error.title"),
        description: t("settings.error.message"),
      });
    }
  };

  const handleCustomImageSave = async () => {
    if (!customImageUrl.trim()) {
      toast({
        variant: "destructive",
        title: t("settings.error.title"),
        description: "Veuillez entrer une URL valide",
      });
      return;
    }

    try {
      await updatePreferences({
        background: {
          type: "image",
          imageUrl: customImageUrl,
        },
      });
      toast({
        title: t("settings.title"),
        description: t("settings.komga.messages.configSaved"),
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        variant: "destructive",
        title: t("settings.error.title"),
        description: t("settings.error.message"),
      });
    }
  };

  return (
    <div className="rounded-lg border bg-card/70 backdrop-blur-md text-card-foreground shadow-sm">
      <div className="p-5 space-y-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {t("settings.background.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("settings.background.description")}
          </p>
        </div>

        <div className="space-y-6">
          {/* Type de background */}
          <div className="space-y-3">
            <Label>{t("settings.background.type.label")}</Label>
            <RadioGroup
              value={preferences.background.type}
              onValueChange={(value) => handleBackgroundTypeChange(value as BackgroundType)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="default" id="bg-default" />
                <Label htmlFor="bg-default" className="cursor-pointer font-normal">
                  {t("settings.background.type.default")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="gradient" id="bg-gradient" />
                <Label htmlFor="bg-gradient" className="cursor-pointer font-normal">
                  {t("settings.background.type.gradient")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="image" id="bg-image" />
                <Label htmlFor="bg-image" className="cursor-pointer font-normal">
                  {t("settings.background.type.image")}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Sélection de dégradé */}
          {preferences.background.type === "gradient" && (
            <div className="space-y-3">
              <Label>{t("settings.background.gradient.label")}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {GRADIENT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleGradientSelect(preset.gradient)}
                    className="relative group rounded-lg overflow-hidden h-20 border-2 transition-all hover:scale-105"
                    style={{
                      background: preset.gradient,
                      borderColor:
                        preferences.background.gradient === preset.gradient
                          ? "hsl(var(--primary))"
                          : "transparent",
                    }}
                  >
                    {preferences.background.gradient === preset.gradient && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {preset.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* URL d'image personnalisée */}
          {preferences.background.type === "image" && (
            <div className="space-y-3">
              <Label htmlFor="custom-bg-url">{t("settings.background.image.label")}</Label>
              <div className="flex gap-2">
                <Input
                  id="custom-bg-url"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleCustomImageSave}>{t("settings.background.image.save")}</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("settings.background.image.description")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

