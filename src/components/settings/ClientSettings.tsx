"use client";

import type { KomgaConfig, TTLConfigData } from "@/types/komga";
import { useTranslate } from "@/hooks/useTranslate";
import { DisplaySettings } from "./DisplaySettings";
import { KomgaSettings } from "./KomgaSettings";
import { CacheSettings } from "./CacheSettings";
import { BackgroundSettings } from "./BackgroundSettings";
import { AdvancedSettings } from "./AdvancedSettings";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Monitor, Network, HardDrive } from "lucide-react";

interface ClientSettingsProps {
  initialConfig: KomgaConfig | null;
  initialTTLConfig: TTLConfigData | null;
}

export function ClientSettings({ initialConfig, initialTTLConfig }: ClientSettingsProps) {
  const { t } = useTranslate();

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold">{t("settings.title")}</h1>

      <Tabs defaultValue="display" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="display" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            {t("settings.tabs.display")}
          </TabsTrigger>
          <TabsTrigger value="connection" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            {t("settings.tabs.connection")}
          </TabsTrigger>
          <TabsTrigger value="cache" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            {t("settings.tabs.cache")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="display" className="mt-6 space-y-6">
          <DisplaySettings />
          <BackgroundSettings />
        </TabsContent>

        <TabsContent value="connection" className="mt-6 space-y-6">
          <KomgaSettings initialConfig={initialConfig} />
          <AdvancedSettings />
        </TabsContent>

        <TabsContent value="cache" className="mt-6 space-y-6">
          <CacheSettings initialTTLConfig={initialTTLConfig} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
