import { getCurrentUserId } from "@/lib/auth-utils";
import { getMediaTransport } from "@/lib/media/media-transport";
import type { ProviderType } from "@/lib/providers/types";

import type { ServedMediaKind } from "./media-url";
import { createMediaRouteWith } from "./media-route-core";

const defaultDependencies = {
  getCurrentUserId,
  getTransport: getMediaTransport,
};

/**
 * Déclare la route `route.ts` qui sert `kind` chez `provider`. Le fichier doit
 * vivre au chemin donné par `mediaRoutePattern(provider, kind)` ; la forme des
 * paramètres, la politique de cache et la forme d'erreur en découlent.
 */
export function createMediaRoute<P extends ProviderType>(
  provider: P,
  kind: ServedMediaKind<P>
) {
  return createMediaRouteWith({ provider, kind }, defaultDependencies);
}
