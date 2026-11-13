import { ClientSettings, type SettingsTab } from "@/components/settings/ClientSettings";
import { getProvider } from "@/lib/providers/provider.factory";
import { listConnections } from "@/app/actions/connections";
import { isConnectionProvider } from "@/lib/connections/descriptors";
import { emptyConnectionLists } from "@/lib/connections/client";
import { ERROR_CODES, type ErrorCode } from "@/constants/errorCodes";
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

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const { tab, new: newConnection } = await searchParams;
  let libraries: NormalizedLibrary[] = [];
  let connectionLists = emptyConnectionLists();
  let connectionsErrorCode: ErrorCode | undefined;

  const [librariesResult, connectionsResult] = await Promise.allSettled([
    getProvider().then((p) => p?.getLibraries() ?? []),
    listConnections(),
  ]);

  // Chaque branche dégrade indépendamment : les bibliothèques sont journalisées
  // ici, l'échec de la liste des connexions est journalisé par le runner et
  // affiché par l'écran des connexions avec son code.
  if (librariesResult.status === "fulfilled") {
    libraries = librariesResult.value;
  } else {
    logger.warn(
      { err: librariesResult.reason, source: "libraries" },
      "Préférences : chargement partiel, libraries indisponible"
    );
  }

  if (connectionsResult.status === "fulfilled") {
    const result = connectionsResult.value;
    if (result.success) connectionLists = result.lists;
    else connectionsErrorCode = result.code;
  } else {
    connectionsErrorCode = ERROR_CODES.CONFIG.FETCH_ERROR;
    logger.error({ err: connectionsResult.reason }, "Préférences : listConnections a levé");
  }

  return (
    <ClientSettings
      initialLibraries={libraries}
      connectionLists={connectionLists}
      connectionsErrorCode={connectionsErrorCode}
      initialTab={parseTab(tab)}
      initialNewConnection={isConnectionProvider(newConnection) ? newConnection : undefined}
    />
  );
}
