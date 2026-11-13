import type {
  IMediaProvider,
  ProviderCapabilities,
  ProviderCapabilityKey,
} from "@/lib/providers/provider.interface";
import { ERROR_CODES, type ErrorCode } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import logger from "@/lib/logger";
import { defaultPreferences, type UserPreferences } from "@/types/preferences";

/**
 * La capacité est portée par le contexte seulement quand `requireCapability`
 * l'a exigée : le gateway prouve sa présence une fois, le loader la reçoit
 * typée et n'a plus à revérifier `provider.capabilities`.
 */
type CapabilityField<C extends ProviderCapabilityKey | undefined> =
  C extends ProviderCapabilityKey
    ? { capability: NonNullable<ProviderCapabilities[C]> }
    : { capability?: undefined };

export type SurfaceContext<C extends ProviderCapabilityKey | undefined = undefined> = {
  /**
   * Utilisateur résolu par la gateway : une surface `ready` a toujours une
   * session. Le loader le passe aux services au lieu qu'ils relisent la
   * session (ADR 0029).
   */
  userId: number;
  provider: IMediaProvider;
  preferences: UserPreferences;
  isAnonymous: boolean;
} & CapabilityField<C>;

export type SurfaceUnavailableReason = "no-provider" | "unsupported-capability";

export type SurfaceResult<
  T,
  C extends ProviderCapabilityKey | undefined = undefined,
> =
  | { status: "ready"; data: T; context: SurfaceContext<C> }
  | { status: "anonymous-empty"; context: SurfaceContext<C> }
  | { status: "unavailable"; reason: SurfaceUnavailableReason }
  | { status: "error"; code: ErrorCode };

export interface SurfaceLoaderDependencies {
  /** Seule lecture de la session par la gateway ; `null` sans session. */
  getCurrentUserId: () => Promise<number | null>;
  getProvider: () => Promise<IMediaProvider | null>;
  getPreferences: (userId: number) => Promise<UserPreferences>;
  redirect: (url: string) => never;
  /** Laisse passer les erreurs de contrôle de Next (redirect, notFound, bailout dynamique). */
  rethrow: (error: unknown) => void;
}

export interface LoadSurfaceOptions<
  T,
  C extends ProviderCapabilityKey | undefined = undefined,
> {
  /** Code utilisé quand le chargement échoue sans `AppError`. */
  fallbackCode: ErrorCode;
  /** Nom de la surface, pour les logs. */
  name: string;
  /** Charge la donnée de la page à partir du contexte résolu. */
  load: (context: SurfaceContext<C>) => Promise<T>;
  /**
   * `redirect` (défaut) envoie vers /settings sans configuration ;
   * `unavailable` laisse la page rendre son état vide dédié (accueil).
   */
  missingProvider?: "redirect" | "unavailable";
  /** `empty` court-circuite le chargement en mode anonyme (page en cours). */
  anonymous?: "load" | "empty";
  /** Réserve la surface à un provider qui déclare cette capacité. */
  requireCapability?: C;
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

type Resolution<C extends ProviderCapabilityKey | undefined> =
  | { status: "ready"; context: SurfaceContext<C> }
  | { status: "anonymous-empty"; context: SurfaceContext<C> }
  | { status: "unavailable"; reason: SurfaceUnavailableReason }
  | { status: "redirect" }
  | { status: "error"; code: ErrorCode };

async function resolveSurfaceContext<
  T,
  C extends ProviderCapabilityKey | undefined,
>(
  options: LoadSurfaceOptions<T, C>,
  dependencies: SurfaceLoaderDependencies
): Promise<Resolution<C>> {
  try {
    const userId = await dependencies.getCurrentUserId();
    // Sans session, la fabrique ne construit aucun provider : même terminal
    // que « aucune configuration », sans lire de préférences.
    if (userId === null) {
      return options.missingProvider === "unavailable"
        ? { status: "unavailable", reason: "no-provider" }
        : { status: "redirect" };
    }

    const [provider, preferences] = await Promise.all([
      dependencies.getProvider(),
      dependencies.getPreferences(userId).catch((error: unknown) => {
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

    const context = {
      userId,
      provider,
      preferences,
      isAnonymous: preferences.anonymousMode,
      // Le contrôle ci-dessus garantit la capacité ; le cast est la seule
      // façon d'exprimer le lien conditionnel type <-> champ pour TypeScript.
      capability: options.requireCapability
        ? provider.capabilities[options.requireCapability]
        : undefined,
    } as unknown as SurfaceContext<C>;

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
export async function loadSurfaceWithDependencies<
  T,
  C extends ProviderCapabilityKey | undefined = undefined,
>(
  options: LoadSurfaceOptions<T, C>,
  dependencies: SurfaceLoaderDependencies
): Promise<SurfaceResult<T, C>> {
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
