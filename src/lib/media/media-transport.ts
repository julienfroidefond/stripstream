import { getProviderDefinition } from "@/lib/connections/registry";
import type { ProviderType } from "@/lib/providers/types";

import type { MediaTransport } from "./types";

/**
 * Factory unique du transport média. Aucune route ne construit un client
 * provider : elle décrit une référence, la définition du provider fournit
 * l'adaptateur (chargé paresseusement, ADR 0030).
 */
export function getMediaTransport(provider: ProviderType): MediaTransport {
  const definition = getProviderDefinition(provider);
  return {
    async fetch(ref, context) {
      const transport = await definition.loadMediaTransport();
      return transport.fetch(ref, context);
    },
  };
}
