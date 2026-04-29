import { ClientSettings } from "@/components/settings/ClientSettings";
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

export default async function SettingsPage() {
  let libraries: NormalizedLibrary[] = [];
  let komgaConfigs: Awaited<ReturnType<typeof listKomgaConfigs>> = [];
  let stripstreamConfigs: Awaited<ReturnType<typeof listStripstreamConfigs>> = [];

  try {
    const [librariesResult, komgaResult, stripstreamResult] = await Promise.allSettled([
      getProvider().then((p) => p?.getLibraries() ?? []),
      listKomgaConfigs(),
      listStripstreamConfigs(),
    ]);

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
    />
  );
}
