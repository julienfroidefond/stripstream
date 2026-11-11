import { getCurrentUser } from "@/lib/auth-utils";
import { getMediaTransport } from "@/lib/media/media-transport";

import type { MediaRouteSpec } from "./types";
import { createMediaRouteWith } from "./media-route-core";

export { mediaRouteError, parseMediaPageNumber } from "./media-route-core";

const defaultDependencies = {
  getCurrentUser,
  getTransport: getMediaTransport,
};

/** Branche les dépendances Next réelles sur le cœur testable. */
export function createMediaRoute(spec: MediaRouteSpec) {
  return createMediaRouteWith(spec, defaultDependencies);
}
