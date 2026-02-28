import { ConfigDBService } from "@/lib/services/config-db.service";
import { LibraryService } from "@/lib/services/library.service";
import { ClientSettings } from "@/components/settings/ClientSettings";
import type { Metadata } from "next";
import type { KomgaConfig, KomgaLibrary } from "@/types/komga";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Préférences",
  description: "Configurez vos préférences StripStream",
};

export default async function SettingsPage() {
  let config: KomgaConfig | null = null;
  let libraries: KomgaLibrary[] = [];

  try {
    // Récupérer la configuration Komga
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

    libraries = await LibraryService.getLibraries();
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la récupération de la configuration:");
    // On ne fait rien si la config n'existe pas, on laissera le composant client gérer l'état initial
  }

  return <ClientSettings initialConfig={config} initialLibraries={libraries} />;
}
