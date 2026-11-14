import { getProvider } from "@/lib/providers/provider.factory";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
import { requireAdmin, requireUserId } from "@/lib/auth/session";
import { PreferencesService } from "@/lib/services/preferences.service";
import { checkRateLimit } from "@/lib/rate-limit";
import { ERROR_CODES, type ErrorCode } from "@/constants/errorCodes";
import { AppError, getErrorMessage } from "@/utils/errors";
import logger from "@/lib/logger";
import type { UserPreferences } from "@/types/preferences";

/** Code porté par un succès : le client peut distinguer un vrai succès d'un échec. */
export const ACTION_OK = "OK" as const;

export type ActionSuccess<T extends object = object> = {
  success: true;
  code: typeof ACTION_OK;
  message: string;
} & T;

export type ActionFailure<T extends object = object> = {
  success: false;
  code: ErrorCode;
  message: string;
} & Partial<T>;

export type ActionResult<T extends object = object> = ActionSuccess<T> | ActionFailure<T>;

/**
 * Échec métier attendu, avec un code stable et éventuellement des données
 * partielles (par exemple le nombre de livres mis à jour avant une panne).
 */
export class ActionError<T extends object = object> extends Error {
  constructor(
    public readonly actionCode: ErrorCode,
    public readonly actionData: Partial<T> = {},
    message?: string
  ) {
    super(message ?? getErrorMessage(actionCode));
    this.name = "ActionError";
  }
}

interface ActionContextBase {
  userId: number | null;
  preferences: UserPreferences | null;
}

export interface ActionContext extends ActionContextBase {
  provider: IMediaProvider | null;
}

export interface ProviderActionContext extends ActionContextBase {
  provider: IMediaProvider;
}

/**
 * Contexte d'une action gardée (`requireUser`, `requireRole` ou `rateLimit`) :
 * le runner a résolu la session, `userId` est donc toujours présent. Les
 * services reçoivent cet identifiant au lieu de relire la session (ADR 0029).
 */
export interface AuthenticatedActionContext extends ActionContext {
  userId: number;
}

export interface AuthenticatedProviderActionContext extends ProviderActionContext {
  userId: number;
}

/** Options qui obligent le runner à résoudre l'utilisateur avant `execute`. */
type AuthenticatedGate =
  | { requireUser: true }
  | { requireRole: ActionRole }
  | { rateLimit: ActionRateLimit };

/** Rôle exigé avant d'exécuter l'action (`admin` : session portant `ROLE_ADMIN`). */
export type ActionRole = "admin";

export interface ActionRateLimit {
  key: (context: { userId: number }) => string;
  limit: number;
  windowMs: number;
  code?: ErrorCode;
  message?: (retryAfterSeconds: number) => string;
}

interface SharedActionOptions<T extends object> {
  /** Nom stable utilisé dans les logs. */
  name: string;
  /** Code renvoyé quand l'erreur n'est ni une `AppError` ni une `ActionError`. */
  fallbackCode: ErrorCode;
  /** Message renvoyé pour une erreur inattendue (sinon message du code). */
  fallbackMessage?: string;
  /** Contexte ajouté aux logs (identifiants, paramètres de l'action). */
  logContext?: Record<string, unknown>;
  /** Exige une session avant d'exécuter l'action. */
  requireUser?: boolean;
  /**
   * Exige un rôle avant d'exécuter l'action (implique `requireUser`).
   * Échoue en `AUTH_UNAUTHENTICATED` sans session, `AUTH_FORBIDDEN` sans le rôle,
   * avant le rate-limit, la garde et toute résolution de provider.
   */
  requireRole?: ActionRole;
  /** Budget partagé, appliqué après l'authentification et avant le provider. */
  rateLimit?: ActionRateLimit;
  /** Validation ou garde propre à l'action, avant toute résolution de provider. */
  guard?: (context: ActionContext) => void | Promise<void>;
  /** Données ajoutées aux échecs (ex. champs `jobId` d'un scan). */
  failureData?: (error: unknown) => Partial<T> | undefined;
  /** Invalidation appelée une seule fois, après une mutation réussie. */
  invalidate?: (context: ActionContextBase) => void;
  /** En mode anonyme, la mutation est ignorée et l'action réussit sans effet. */
  skipAnonymous?: {
    message: string;
    data?: Partial<T>;
  };
}

export interface RunActionOptions<T extends object> extends SharedActionOptions<T> {
  execute: (context: ActionContext) => Promise<{ message: string } & T>;
}

export interface RunProviderActionOptions<T extends object> extends SharedActionOptions<T> {
  execute: (context: ProviderActionContext) => Promise<{ message: string } & T>;
}

export type RunAuthenticatedActionOptions<T extends object> = SharedActionOptions<T> &
  AuthenticatedGate & {
    execute: (context: AuthenticatedActionContext) => Promise<{ message: string } & T>;
  };

export type RunAuthenticatedProviderActionOptions<T extends object> = SharedActionOptions<T> &
  AuthenticatedGate & {
    execute: (context: AuthenticatedProviderActionContext) => Promise<{ message: string } & T>;
  };

function buildFailure<T extends object>(
  code: ErrorCode,
  message: string,
  data?: Partial<T>
): ActionFailure<T> {
  return {
    success: false,
    code,
    message,
    ...(data ?? {}),
  } as ActionFailure<T>;
}

function logFailure(
  name: string,
  error: unknown,
  context: Record<string, unknown> | undefined,
  expected: boolean
): void {
  const payload = { err: error, ...context };
  if (expected) {
    logger.warn(payload, `${name} failed`);
  } else {
    logger.error(payload, `${name} crashed`);
  }
}

async function executeAction<T extends object>(
  options: SharedActionOptions<T>,
  resolveProvider: (() => Promise<IMediaProvider | null>) | null,
  execute: (context: ActionContext) => Promise<{ message: string } & T>
): Promise<ActionResult<T>> {
  let userId: number | null = null;
  let preferences: UserPreferences | null = null;

  try {
    if (options.requireRole === "admin") {
      const admin = await requireAdmin();
      userId = parseInt(admin.id, 10);
    } else if (options.requireUser || options.rateLimit) {
      userId = await requireUserId();
    }

    if (options.rateLimit) {
      const rateLimit = await checkRateLimit(
        options.rateLimit.key({ userId: userId as number }),
        options.rateLimit
      );
      if (!rateLimit.allowed) {
        const retryAfterSeconds = Math.ceil(rateLimit.resetMs / 1000);
        throw new ActionError(
          options.rateLimit.code ?? ERROR_CODES.AUTH.RATE_LIMITED,
          { retryAfterSeconds } as unknown as Partial<T>,
          options.rateLimit.message?.(retryAfterSeconds)
        );
      }
    }

    if (options.guard) {
      await options.guard({ userId, preferences, provider: null });
    }

    if (options.skipAnonymous) {
      // Le mode anonyme est une préférence de l'utilisateur : sans gate
      // explicite, on résout quand même la session ici (même échec
      // `AUTH_UNAUTHENTICATED` qu'avant) au lieu de la laisser au service.
      userId ??= await requireUserId();
      preferences = await PreferencesService.getPreferences(userId);
      if (preferences.anonymousMode) {
        return {
          success: true,
          code: ACTION_OK,
          message: options.skipAnonymous.message,
          ...(options.skipAnonymous.data ?? {}),
        } as ActionSuccess<T>;
      }
    }

    const provider = resolveProvider ? await resolveProvider() : null;
    if (resolveProvider && !provider) {
      return buildFailure(
        ERROR_CODES.PROVIDER.NOT_CONFIGURED,
        "Provider non configuré",
        options.failureData?.(new AppError(ERROR_CODES.PROVIDER.NOT_CONFIGURED))
      );
    }

    const payload = await execute({ userId, preferences, provider });

    try {
      options.invalidate?.({ userId, preferences });
    } catch (error) {
      // La mutation est déjà acquise : une invalidation ratée ne doit pas
      // transformer un succès en échec pour l'utilisateur.
      logger.error({ err: error, ...options.logContext }, `${options.name} invalidation failed`);
    }

    return {
      success: true,
      code: ACTION_OK,
      ...payload,
    } as ActionSuccess<T>;
  } catch (error) {
    if (error instanceof ActionError) {
      logFailure(options.name, error, options.logContext, true);
      return buildFailure(error.actionCode, error.message, {
        ...error.actionData,
        ...options.failureData?.(error),
      } as Partial<T>);
    }

    if (error instanceof AppError) {
      logFailure(options.name, error, options.logContext, true);
      return buildFailure(error.code, error.message, options.failureData?.(error));
    }

    logFailure(options.name, error, options.logContext, false);
    return buildFailure(
      options.fallbackCode,
      options.fallbackMessage ?? getErrorMessage(options.fallbackCode),
      options.failureData?.(error)
    );
  }
}

/**
 * Exécute une action serveur. Avec `requireUser`, `requireRole` ou `rateLimit`,
 * `execute` reçoit un `userId: number` : c'est l'identité à transmettre aux
 * services, qui ne lisent plus la session eux-mêmes.
 */
export function runAction<T extends object = object>(
  options: RunAuthenticatedActionOptions<T>
): Promise<ActionResult<T>>;
export function runAction<T extends object = object>(
  options: RunActionOptions<T>
): Promise<ActionResult<T>>;
export function runAction<T extends object = object>(
  options: RunActionOptions<T> | RunAuthenticatedActionOptions<T>
): Promise<ActionResult<T>> {
  // Les gates d'authentification ont résolu `userId` avant `execute` : le
  // contexte réel satisfait le type plus étroit de la première surcharge.
  return executeAction(options, null, options.execute as RunActionOptions<T>["execute"]);
}

export function runProviderAction<T extends object = object>(
  options: RunAuthenticatedProviderActionOptions<T>
): Promise<ActionResult<T>>;
export function runProviderAction<T extends object = object>(
  options: RunProviderActionOptions<T>
): Promise<ActionResult<T>>;
export function runProviderAction<T extends object = object>(
  options: RunProviderActionOptions<T> | RunAuthenticatedProviderActionOptions<T>
): Promise<ActionResult<T>> {
  return executeAction(options, getProvider, options.execute as RunActionOptions<T>["execute"]);
}
