import { redirect, unstable_rethrow } from "next/navigation";
import { getProvider } from "@/lib/providers/provider.factory";
import { PreferencesService } from "@/lib/services/preferences.service";
import {
  loadSurfaceWithDependencies,
  type LoadSurfaceOptions,
  type SurfaceLoaderDependencies,
  type SurfaceResult,
} from "./surface-loader";

const dependencies: SurfaceLoaderDependencies = {
  getProvider,
  getPreferences: () => PreferencesService.getPreferences(),
  redirect: (url) => redirect(url),
  rethrow: (error) => unstable_rethrow(error),
};

/**
 * Point d'entrée des pages serveur. Le cœur (`surface-loader`) reste pur et
 * testable ; ce module branche les dépendances réelles de Next.
 */
export function loadSurface<T>(options: LoadSurfaceOptions<T>): Promise<SurfaceResult<T>> {
  return loadSurfaceWithDependencies(options, dependencies);
}

export type {
  LoadSurfaceOptions,
  SurfaceContext,
  SurfaceResult,
  SurfaceUnavailableReason,
} from "./surface-loader";
