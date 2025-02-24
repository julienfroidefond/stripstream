import { ConfigDBService } from "@/lib/services/config-db.service";
import { ClientSettings } from "@/components/settings/ClientSettings";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Préférences",
  description: "Configurez vos préférences StripStream",
};

export default async function SettingsPage() {
  let config = null;
  let ttlConfig = null;

  try {
    // Récupérer la configuration Komga
    const mongoConfig = await ConfigDBService.getConfig();
    if (mongoConfig) {
      config = {
        url: mongoConfig.url,
        username: mongoConfig.username,
        userId: mongoConfig.userId,
        authHeader: mongoConfig.authHeader,
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
