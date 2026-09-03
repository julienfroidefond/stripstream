"use client";

import { useState, useEffect } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { usePreferences } from "@/contexts/PreferencesContext";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GRADIENT_PRESETS } from "@/types/preferences";
import type { BackgroundType } from "@/types/preferences";
import { Check, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SliderControl } from "@/components/ui/slider-control";
import type { NormalizedLibrary } from "@/lib/providers/types";
import logger from "@/lib/logger";

interface BackgroundSettingsProps {
  initialLibraries: NormalizedLibrary[];
}

export function BackgroundSettings({ initialLibraries }: BackgroundSettingsProps) {
  const { t } = useTranslate();
  const { toast } = useToast();
  const { preferences, updatePreferences } = usePreferences();
  const [customImageUrl, setCustomImageUrl] = useState(preferences.background.imageUrl || "");
  const [komgaConfigValid, setKomgaConfigValid] = useState(false);
  const [libraries, setLibraries] = useState<NormalizedLibrary[]>(initialLibraries || []);
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>(
    preferences.background.komgaLibraries || []
  );

  useEffect(() => {
    setLibraries(initialLibraries || []);
  }, [initialLibraries]);

  useEffect(() => {
    setKomgaConfigValid(libraries.length > 0);
  }, [libraries]);

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
      logger.error({ err: error }, "Erreur:");
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
          ...preferences.background,
          type: "gradient",
          gradient,
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
          ...preferences.background,
          type: "image",
          imageUrl: customImageUrl,
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

  const handleOpacityChange = async (value: number[]) => {
    try {
      await updatePreferences({
        background: {
          ...preferences.background,
          opacity: value[0],
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur:");
    }
  };

  const handleBlurChange = async (value: number[]) => {
    try {
      await updatePreferences({
        background: {
          ...preferences.background,
          blur: value[0],
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur:");
    }
  };

  const handleLibraryToggle = async (libraryId: string) => {
    const newSelection = selectedLibraries.includes(libraryId)
      ? selectedLibraries.filter((id) => id !== libraryId)
      : [...selectedLibraries, libraryId];

    setSelectedLibraries(newSelection);

    try {
      await updatePreferences({
        background: {
          ...preferences.background,
          komgaLibraries: newSelection,
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur:");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <CardTitle>{t("settings.background.title")}</CardTitle>
        </div>
        <CardDescription>{t("settings.background.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
              {komgaConfigValid && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="komga-random" id="bg-komga-random" />
                  <Label htmlFor="bg-komga-random" className="cursor-pointer font-normal">
                    Cover aléatoire
                  </Label>
                </div>
              )}
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
                <Button onClick={handleCustomImageSave}>
                  {t("settings.background.image.save")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("settings.background.image.description")}
              </p>
            </div>
          )}

          {/* Sélection des bibliothèques utilisées pour la cover aléatoire */}
          {preferences.background.type === "komga-random" && (
            <div className="space-y-3">
              <Label>Bibliothèques</Label>
              <div className="space-y-2">
                {libraries.map((library) => (
                  <div key={library.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`lib-${library.id}`}
                      checked={selectedLibraries.includes(library.id)}
                      onCheckedChange={() => handleLibraryToggle(library.id)}
                    />
                    <Label
                      htmlFor={`lib-${library.id}`}
                      className="cursor-pointer font-normal text-sm"
                    >
                      {library.name}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Sélectionnez une ou plusieurs bibliothèques pour choisir une cover aléatoire
              </p>
            </div>
          )}

          {/* Contrôles d'opacité et de flou */}
          {(preferences.background.type === "gradient" ||
            preferences.background.type === "image" ||
            preferences.background.type === "komga-random") && (
            <>
              <SliderControl
                label="Opacité du contenu"
                value={preferences.background.opacity || 10}
                min={0}
                max={100}
                step={5}
                unit="%"
                description="Contrôle la transparence du contenu par rapport au background"
                onChange={(value) => handleOpacityChange([value])}
              />

              <SliderControl
                label="Flou du background"
                value={preferences.background.blur || 0}
                min={0}
                max={20}
                step={1}
                unit="px"
                description="Applique un effet de flou au background"
                onChange={(value) => handleBlurChange([value])}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
