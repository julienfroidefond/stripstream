import {
  ClientSettings,
  type ConnectionType,
  type SettingsTab,
} from "@/components/settings/ClientSettings";
import { getProvider } from "@/lib/providers/provider.factory";
import { listKomgaConfigs } from "@/app/actions/config";
import { listStripstreamConfigs } from "@/app/actions/stripstream-config";
import type { Metadata } from "next";
import type { NormalizedLibrary } from "@/lib/providers/types";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Préférences",
  description: "Configurez vos préférences StripStream",
};

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string; new?: string }>;
}

function parseTab(value: string | undefined): SettingsTab | undefined {
  return value === "display" || value === "reader" || value === "connection" ? value : undefined;
}

function parseConnectionType(value: string | undefined): ConnectionType | undefined {
  return value === "komga" || value === "stripstream" ? value : undefined;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const { tab, new: newConnection } = await searchParams;
  let libraries: NormalizedLibrary[] = [];
  let komgaConfigs: Awaited<ReturnType<typeof listKomgaConfigs>> = [];
  let stripstreamConfigs: Awaited<ReturnType<typeof listStripstreamConfigs>> = [];

  try {
    const [librariesResult, komgaResult, stripstreamResult] = await Promise.allSettled([
      getProvider().then((p) => p?.getLibraries() ?? []),
      listKomgaConfigs(),
      listStripstreamConfigs(),
    ]);

    // Chaque branche dégrade indépendamment : on journalise celles qui
    // échouent au lieu de les remplacer silencieusement par une valeur vide.
    for (const [source, result] of [
      ["libraries", librariesResult],
      ["komgaConfigs", komgaResult],
      ["stripstreamConfigs", stripstreamResult],
    ] as const) {
      if (result.status === "rejected") {
        logger.warn(
          { err: result.reason, source },
          `Préférences : chargement partiel, ${source} indisponible`
        );
      }
    }

    if (librariesResult.status === "fulfilled") libraries = librariesResult.value;
    if (komgaResult.status === "fulfilled") komgaConfigs = komgaResult.value;
    if (stripstreamResult.status === "fulfilled") stripstreamConfigs = stripstreamResult.value;
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la récupération de la configuration:");
  }

  return (
    <ClientSettings
      initialLibraries={libraries}
      komgaConfigs={komgaConfigs}
      stripstreamConfigs={stripstreamConfigs}
      initialTab={parseTab(tab)}
      initialNewConnection={parseConnectionType(newConnection)}
    />
  );
}
