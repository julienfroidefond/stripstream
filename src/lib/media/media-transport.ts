import type { ProviderType } from "@/lib/providers/types";

import { komgaMediaTransport } from "./komga.transport";
import { stripstreamMediaTransport } from "./stripstream.transport";
import type { MediaTransport } from "./types";

/**
 * Factory unique du transport média. Aucune route ne construit un client
 * provider : elle décrit une référence, ce point choisit l'adaptateur.
 */
export function getMediaTransport(provider: ProviderType): MediaTransport {
  return provider === "komga" ? komgaMediaTransport : stripstreamMediaTransport;
}
