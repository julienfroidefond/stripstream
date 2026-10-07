import { getProvider } from "@/lib/providers/provider.factory";
import type { NormalizedReadingStats } from "@/lib/providers/types";
import logger from "@/lib/logger";

/**
 * Statistiques de lecture de la connexion active.
 * Ne lève jamais : renvoie `null` si aucun provider n'est configuré ou si
 * le backend est indisponible, afin que la page compte reste utilisable.
 */
export async function getReadingStats(): Promise<NormalizedReadingStats | null> {
  try {
    const provider = await getProvider();
    if (!provider) return null;
    return await provider.getReadingStats();
  } catch (error) {
    logger.warn({ err: error }, "Statistiques de lecture indisponibles");
    return null;
  }
}
