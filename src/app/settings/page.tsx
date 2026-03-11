import { ConfigDBService } from "@/lib/services/config-db.service";
import { ClientSettings } from "@/components/settings/ClientSettings";
import { getProvider } from "@/lib/providers/provider.factory";
import { getStripstreamConfig, getProvidersStatus } from "@/app/actions/stripstream-config";
import type { Metadata } from "next";
import type { KomgaConfig } from "@/types/komga";
import type { NormalizedLibrary } from "@/lib/providers/types";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Préférences",
  description: "Configurez vos préférences StripStream",
};

export default async function SettingsPage() {
  let config: KomgaConfig | null = null;
  let libraries: NormalizedLibrary[] = [];
  let stripstreamConfig: { url?: string; hasToken: boolean } | null = null;
  let providersStatus: {
    komgaConfigured: boolean;
    stripstreamConfigured: boolean;
    activeProvider: "komga" | "stripstream";
  } | undefined = undefined;

  try {
    const mongoConfig: KomgaConfig | null = await ConfigDBService.getConfig();
    if (mongoConfig) {
      config = {
        url: mongoConfig.url,
        username: mongoConfig.username,
        userId: mongoConfig.userId,
        authHeader: mongoConfig.authHeader,
        password: null,
      };
    }

    const [provider, stConfig, status] = await Promise.allSettled([
      getProvider().then((p) => p?.getLibraries() ?? []),
      getStripstreamConfig(),
      getProvidersStatus(),
    ]);

    if (provider.status === "fulfilled") {
      libraries = provider.value;
    }
    if (stConfig.status === "fulfilled") {
      stripstreamConfig = stConfig.value;
    }
    if (status.status === "fulfilled") {
      providersStatus = status.value;
    }
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la récupération de la configuration:");
  }

  return (
    <ClientSettings
      initialConfig={config}
      initialLibraries={libraries}
      stripstreamConfig={stripstreamConfig}
      providersStatus={providersStatus}
    />
  );
}
