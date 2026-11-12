import type {
  IMediaProvider,
  ProviderCapabilityKey,
} from "@/lib/providers/provider.interface";
import { ERROR_CODES, type ErrorCode } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import logger from "@/lib/logger";
import { defaultPreferences, type UserPreferences } from "@/types/preferences";

export interface SurfaceContext {
  provider: IMediaProvider;
  preferences: UserPreferences;
  isAnonymous: boolean;
}

export type SurfaceUnavailableReason = "no-provider" | "unsupported-capability";

export type SurfaceResult<T> =
  | { status: "ready"; data: T; context: SurfaceContext }
  | { status: "anonymous-empty"; context: SurfaceContext }
  | { status: "unavailable"; reason: SurfaceUnavailableReason }
  | { status: "error"; code: ErrorCode };

export interface SurfaceLoaderDependencies {
  getProvider: () => Promise<IMediaProvider | null>;
  getPreferences: () => Promise<UserPreferences>;
  redirect: (url: string) => never;
  /** Laisse passer les erreurs de contrôle de Next (redirect, notFound, bailout dynamique). */
  rethrow: (error: unknown) => void;
}

export interface LoadSurfaceOptions<T> {
  /** Code utilisé quand le chargement échoue sans `AppError`. */
  fallbackCode: ErrorCode;
  /** Nom de la surface, pour les logs. */
  name: string;
  /** Charge la donnée de la page à partir du contexte résolu. */
  load: (context: SurfaceContext) => Promise<T>;
  /**
   * `redirect` (défaut) envoie vers /settings sans configuration ;
   * `unavailable` laisse la page rendre son état vide dédié (accueil).
   */
  missingProvider?: "redirect" | "unavailable";
  /** `empty` court-circuite le chargement en mode anonyme (page en cours). */
  anonymous?: "load" | "empty";
  /** Réserve la surface à un provider qui déclare cette capacité. */
  requireCapability?: ProviderCapabilityKey;
}

function isMissingConfig(error: unknown): boolean {
  return (
    error instanceof AppError &&
    (error.code === ERROR_CODES.KOMGA.MISSING_CONFIG ||
      error.code === ERROR_CODES.STRIPSTREAM.MISSING_CONFIG)
  );
}

function resolveErrorCode(error: unknown, fallbackCode: ErrorCode): ErrorCode {
  return error instanceof AppError ? error.code : fallbackCode;
}

type Resolution =
  | { status: "ready"; context: SurfaceContext }
  | { status: "anonymous-empty"; context: SurfaceContext }
  | { status: "unavailable"; reason: SurfaceUnavailableReason }
  | { status: "redirect" }
  | { status: "error"; code: ErrorCode };

async function resolveSurfaceContext<T>(
  options: LoadSurfaceOptions<T>,
  dependencies: SurfaceLoaderDependencies
): Promise<Resolution> {
  try {
    const [provider, preferences] = await Promise.all([
      dependencies.getProvider(),
      dependencies.getPreferences().catch((error: unknown) => {
        dependencies.rethrow(error);
        // Une préférence illisible ne doit pas masquer une page entière : on
        // rend avec les valeurs par défaut, comme le faisait l'accueil.
        logger.warn({ err: error }, `${options.name} preferences fallback`);
        return { ...defaultPreferences };
      }),
    ]);

    if (!provider) {
      return options.missingProvider === "unavailable"
        ? { status: "unavailable", reason: "no-provider" }
        : { status: "redirect" };
    }

    if (options.requireCapability && !provider.capabilities[options.requireCapability]) {
      return { status: "unavailable", reason: "unsupported-capability" };
    }

    const context: SurfaceContext = {
      provider,
      preferences,
      isAnonymous: preferences.anonymousMode,
    };

    if (options.anonymous === "empty" && context.isAnonymous) {
      return { status: "anonymous-empty", context };
    }

    return { status: "ready", context };
  } catch (error) {
    dependencies.rethrow(error);
    if (isMissingConfig(error)) return { status: "redirect" };
    return { status: "error", code: resolveErrorCode(error, options.fallbackCode) };
  }
}

/**
 * Cœur testable du gateway de page : résout le provider et les préférences,
 * applique la politique anonyme, vérifie la capacité requise, redirige vers
 * /settings sans configuration et mappe les erreurs en un état terminal.
 */
export async function loadSurfaceWithDependencies<T>(
  options: LoadSurfaceOptions<T>,
  dependencies: SurfaceLoaderDependencies
): Promise<SurfaceResult<T>> {
  const resolution = await resolveSurfaceContext(options, dependencies);

  switch (resolution.status) {
    case "redirect":
      return dependencies.redirect("/settings");
    case "unavailable":
    case "error":
    case "anonymous-empty":
      return resolution;
    case "ready":
      break;
  }

  try {
    return {
      status: "ready",
      data: await options.load(resolution.context),
      context: resolution.context,
    };
  } catch (error) {
    dependencies.rethrow(error);
    if (isMissingConfig(error)) return dependencies.redirect("/settings");

    const code = resolveErrorCode(error, options.fallbackCode);
    logger.error(
      { err: error, code },
      `${options.name} data load failed`
    );
    return { status: "error", code };
  }
}
