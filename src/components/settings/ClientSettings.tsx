"use client";

import type { KomgaConfig } from "@/types/komga";
import type { KomgaLibrary } from "@/types/komga";
import { useTranslate } from "@/hooks/useTranslate";
import { DisplaySettings } from "./DisplaySettings";
import { KomgaSettings } from "./KomgaSettings";
import { BackgroundSettings } from "./BackgroundSettings";
import { AdvancedSettings } from "./AdvancedSettings";
import { CacheSettings } from "./CacheSettings";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Monitor, Network } from "lucide-react";

interface ClientSettingsProps {
  initialConfig: KomgaConfig | null;
  initialLibraries: KomgaLibrary[];
}

export function ClientSettings({ initialConfig, initialLibraries }: ClientSettingsProps) {
  const { t } = useTranslate();

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold">{t("settings.title")}</h1>

      <Tabs defaultValue="display" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="display" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            {t("settings.tabs.display")}
          </TabsTrigger>
          <TabsTrigger value="connection" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            {t("settings.tabs.connection")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="display" className="mt-6 space-y-6">
          <DisplaySettings />
          <BackgroundSettings initialLibraries={initialLibraries} />
        </TabsContent>

        <TabsContent value="connection" className="mt-6 space-y-6">
          <KomgaSettings initialConfig={initialConfig} />
          <AdvancedSettings />
          <CacheSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
