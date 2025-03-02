"use client";

import type { KomgaConfig, TTLConfigData } from "@/types/komga";
import { useTranslate } from "@/hooks/useTranslate";
import { DisplaySettings } from "./DisplaySettings";
import { KomgaSettings } from "./KomgaSettings";
import { CacheSettings } from "./CacheSettings";

interface ClientSettingsProps {
  initialConfig: KomgaConfig | null;
  initialTTLConfig: TTLConfigData | null;
}

export function ClientSettings({ initialConfig, initialTTLConfig }: ClientSettingsProps) {
  const { t } = useTranslate();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
      <div className="space-y-8">
        <DisplaySettings />
        <KomgaSettings initialConfig={initialConfig} />
        <CacheSettings initialTTLConfig={initialTTLConfig} />
      </div>
    </div>
  );
}
