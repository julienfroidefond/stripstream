"use client";

import { useTranslate } from "@/hooks/useTranslate";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Palette, BookOpen, ArrowLeftRight, Columns2 } from "lucide-react";
import logger from "@/lib/logger";

type ReaderBackground = "default" | "black" | "white" | "cream";
type ReadingDirection = "ltr" | "rtl";

const READER_BACKGROUNDS: { value: ReaderBackground; labelKey: string; icon: React.ReactNode }[] = [
  { value: "default", labelKey: "reader.controls.background.default", icon: <Palette className="h-4 w-4" /> },
  { value: "black", labelKey: "reader.controls.background.black", icon: <div className="h-4 w-4 rounded bg-black border" /> },
  { value: "white", labelKey: "reader.controls.background.white", icon: <div className="h-4 w-4 rounded bg-white border" /> },
  { value: "cream", labelKey: "reader.controls.background.cream", icon: <div className="h-4 w-4 rounded bg-[#f4ead8] border" /> },
];

const READING_DIRECTIONS: { value: ReadingDirection; labelKey: string }[] = [
  { value: "ltr", labelKey: "reader.controls.direction.ltr" },
  { value: "rtl", labelKey: "reader.controls.direction.rtl" },
];

export function ReaderSettings() {
  const { t } = useTranslate();
  const { toast } = useToast();
  const { preferences, updatePreferences } = usePreferences();

  const handleReadingDirectionChange = async (value: ReadingDirection) => {
    try {
      await updatePreferences({ readingDirection: value });
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

  const handleReaderBackgroundChange = async (value: ReaderBackground) => {
    try {
      await updatePreferences({ readerBackground: value });
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

  const handleDoublePageChange = async (checked: boolean) => {
    try {
      await updatePreferences({ readerDoublePageMode: checked });
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t("settings.reader.experience.title")}</CardTitle>
        </div>
        <CardDescription>{t("settings.reader.experience.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Reading Direction */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            <Label>{t("settings.reader.readingDirection.label")}</Label>
          </div>
          <RadioGroup
            value={preferences.readingDirection}
            onValueChange={(value) => handleReadingDirectionChange(value as ReadingDirection)}
            className="flex items-center gap-6"
          >
            {READING_DIRECTIONS.map((dir) => (
              <div key={dir.value} className="flex items-center space-x-2">
                <RadioGroupItem value={dir.value} id={`reading-dir-${dir.value}`} />
                <Label htmlFor={`reading-dir-${dir.value}`} className="cursor-pointer font-normal">
                  {t(dir.labelKey)}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            {t("settings.reader.readingDirection.description")}
          </p>
        </div>

        {/* Reader Background */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <Label>{t("settings.reader.background.label")}</Label>
          </div>
          <RadioGroup
            value={preferences.readerBackground}
            onValueChange={(value) => handleReaderBackgroundChange(value as ReaderBackground)}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {READER_BACKGROUNDS.map((bg) => (
              <div key={bg.value} className="relative group">
                <RadioGroupItem
                  value={bg.value}
                  id={`reader-bg-${bg.value}`}
                  className="absolute inset-0 opacity-0"
                />
                <label
                  htmlFor={`reader-bg-${bg.value}`}
                  className="relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:scale-105 cursor-pointer min-h-[100px]"
                  style={{
                    backgroundColor: bg.value === "default" ? "hsl(var(--background))" : undefined,
                    borderColor:
                      preferences.readerBackground === bg.value ? "hsl(var(--primary))" : "transparent",
                  }}
                >
                  <div className="mb-2">{bg.icon}</div>
                  <span className="text-sm font-medium">{t(bg.labelKey)}</span>
                </label>
              </div>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            {t("settings.reader.background.description")}
          </p>
        </div>

        {/* Double Page Mode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Columns2 className="h-4 w-4 text-muted-foreground" />
            <div className="space-y-0.5">
              <Label htmlFor="double-page-mode">{t("settings.reader.doublePage.label")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.reader.doublePage.description")}
              </p>
            </div>
          </div>
          <Switch
            id="double-page-mode"
            checked={preferences.readerDoublePageMode}
            onCheckedChange={handleDoublePageChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}