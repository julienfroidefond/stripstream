"use client";

import { useEffect, useState } from "react";
import type { KomgaConfig } from "@/types/komga";
import type { NormalizedLibrary, ProviderType } from "@/lib/providers/types";
import { useTranslate } from "@/hooks/useTranslate";
import { DisplaySettings } from "./DisplaySettings";
import { KomgaSettings } from "./KomgaSettings";
import { StripstreamSettings } from "./StripstreamSettings";
import { ProviderSelector } from "./ProviderSelector";
import { BackgroundSettings } from "./BackgroundSettings";
import { AdvancedSettings } from "./AdvancedSettings";
import { CacheSettings } from "./CacheSettings";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Monitor, Network } from "lucide-react";

interface ClientSettingsProps {
  initialConfig: KomgaConfig | null;
  initialLibraries: NormalizedLibrary[];
  stripstreamConfig?: { url?: string; hasToken: boolean } | null;
  providersStatus?: {
    komgaConfigured: boolean;
    stripstreamConfigured: boolean;
    activeProvider: ProviderType;
  };
}

const SETTINGS_TAB_STORAGE_KEY = "stripstream:settings-active-tab";

export function ClientSettings({
  initialConfig,
  initialLibraries,
  stripstreamConfig,
  providersStatus,
}: ClientSettingsProps) {
  const { t } = useTranslate();
  const [activeTab, setActiveTab] = useState<"display" | "connection">("display");

  useEffect(() => {
    const savedTab = window.sessionStorage.getItem(SETTINGS_TAB_STORAGE_KEY);
    if (savedTab === "display" || savedTab === "connection") {
      const rafId = window.requestAnimationFrame(() => {
        setActiveTab(savedTab);
      });
      return () => window.cancelAnimationFrame(rafId);
    }
  }, []);

  const handleTabChange = (tab: string) => {
    if (tab === "display" || tab === "connection") {
      setActiveTab(tab);
      window.sessionStorage.setItem(SETTINGS_TAB_STORAGE_KEY, tab);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
            {providersStatus && (
              <ProviderSelector
                activeProvider={providersStatus.activeProvider}
                komgaConfigured={providersStatus.komgaConfigured}
                stripstreamConfigured={providersStatus.stripstreamConfigured}
              />
            )}
            <KomgaSettings initialConfig={initialConfig} />
            <StripstreamSettings
              initialUrl={stripstreamConfig?.url}
              hasToken={stripstreamConfig?.hasToken}
            />
            <AdvancedSettings />
            <CacheSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
