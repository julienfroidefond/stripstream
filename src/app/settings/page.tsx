import { ConfigDBService } from "@/lib/services/config-db.service";
import { ClientSettings } from "@/components/settings/ClientSettings";
import type { Metadata } from "next";
import type { KomgaConfig, TTLConfig } from "@/types/komga";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Préférences",
  description: "Configurez vos préférences StripStream",
};

export default async function SettingsPage() {
  let config: KomgaConfig | null = null;
  let ttlConfig: TTLConfig | null = null;

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

    // Récupérer la configuration TTL
    ttlConfig = await ConfigDBService.getTTLConfig();
  } catch (error) {
    console.error("Erreur lors de la récupération de la configuration:", error);
    // On ne fait rien si la config n'existe pas, on laissera le composant client gérer l'état initial
  }

  return <ClientSettings initialConfig={config} initialTTLConfig={ttlConfig} />;
}
