"use client";

import { useEffect, useState } from "react";
import type { NormalizedLibrary } from "@/lib/providers/types";
import type { KomgaConfigSummary } from "@/app/actions/config";
import type { StripstreamConfigSummary } from "@/app/actions/stripstream-config";
import { useTranslate } from "@/hooks/useTranslate";
import { DisplaySettings } from "./DisplaySettings";
import { ConnectionsSettings } from "./ConnectionsSettings";
import { BackgroundSettings } from "./BackgroundSettings";
import { AdvancedSettings } from "./AdvancedSettings";
import { ReaderSettings } from "./ReaderSettings";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Monitor, Network, BookOpen } from "lucide-react";

interface ClientSettingsProps {
  initialLibraries: NormalizedLibrary[];
  komgaConfigs: KomgaConfigSummary[];
  stripstreamConfigs: StripstreamConfigSummary[];
}

const SETTINGS_TAB_STORAGE_KEY = "stripstream:settings-active-tab";

export function ClientSettings({
  initialLibraries,
  komgaConfigs,
  stripstreamConfigs,
}: ClientSettingsProps) {
  const { t } = useTranslate();
  const [activeTab, setActiveTab] = useState<"display" | "reader" | "connection">("display");

  useEffect(() => {
    const savedTab = window.sessionStorage.getItem(SETTINGS_TAB_STORAGE_KEY);
    if (savedTab === "display" || savedTab === "reader" || savedTab === "connection") {
      const rafId = window.requestAnimationFrame(() => {
        setActiveTab(savedTab);
      });
      return () => window.cancelAnimationFrame(rafId);
    }
  }, []);

  const handleTabChange = (tab: string) => {
    if (tab === "display" || tab === "reader" || tab === "connection") {
      setActiveTab(tab);
      window.sessionStorage.setItem(SETTINGS_TAB_STORAGE_KEY, tab);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="display" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              {t("settings.tabs.display")}
            </TabsTrigger>
            <TabsTrigger value="reader" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {t("settings.tabs.reading")}
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

          <TabsContent value="reader" className="mt-6 space-y-6">
            <ReaderSettings />
          </TabsContent>

          <TabsContent value="connection" className="mt-6 space-y-6">
            <ConnectionsSettings
              komgaConfigs={komgaConfigs}
              stripstreamConfigs={stripstreamConfigs}
            />
            <AdvancedSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
