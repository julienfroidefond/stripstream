"use server";

import { requireUserId } from "@/lib/auth-utils";
import {
  CONNECTION_TEST_RATE_LIMIT,
  activateConnection,
  connectionFromStripstreamToken,
  connectionTestRateLimitKey,
  deleteConnection,
  listConnections,
  saveConnection,
  testConnection,
  testStoredConnection,
} from "@/lib/connections";
import { ERROR_CODES } from "@/constants/errorCodes";
import {
  ActionError,
  runAction,
  type ActionResult,
} from "@/lib/actions/action-runner";

export interface StripstreamConfigSummary {
  id: number;
  name: string;
  url: string;
  isActive: boolean;
}

interface SaveStripstreamInput {
  id?: number;
  name: string;
  url: string;
  token?: string;
}

const STRIPSTREAM_TEST_RATE_LIMIT = {
  key: ({ userId }: { userId: number }) =>
    connectionTestRateLimitKey("stripstream", userId),
  ...CONNECTION_TEST_RATE_LIMIT,
  code: ERROR_CODES.AUTH.RATE_LIMITED,
  message: rateLimitedMessage,
} as const;

function rateLimitedMessage(retryAfterSeconds: number): string {
  return `Trop de tentatives. Réessaie dans ${retryAfterSeconds}s.`;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export async function testStripstreamConnection(
  url: string,
  token: string
): Promise<ActionResult> {
  return runAction({
    name: "testStripstreamConnection",
    fallbackCode: ERROR_CODES.CONFIG.TEST_ERROR,
    fallbackMessage: "Erreur lors du test de connexion",
    logContext: { url },
    requireUser: true,
    rateLimit: STRIPSTREAM_TEST_RATE_LIMIT,
    execute: async () => {
      const result = await testConnection(connectionFromStripstreamToken(url, token));
      if (!result.ok) {
        throw new ActionError(
          ERROR_CODES.CONFIG.TEST_ERROR,
          {},
          result.error ?? "Connexion échouée"
        );
      }
      return { message: "Connexion Stripstream réussie !" };
    },
  });
}

export async function listStripstreamConfigs(): Promise<StripstreamConfigSummary[]> {
  try {
    const userId = await requireUserId();
    return (await listConnections(userId)).stripstream;
  } catch {
    return [];
  }
}

/**
 * Crée ou met à jour une config Stripstream.
 * - Sans `id` → création. Si 1re config, devient automatiquement active.
 * - Avec `id` → update. Si `token` est vide, le token existant est conservé.
 */
export async function saveStripstreamConfig(
  input: SaveStripstreamInput
): Promise<ActionResult<{ id: number }>> {
  return runAction<{ id: number }>({
    name: "saveStripstreamConfig",
    fallbackCode: ERROR_CODES.CONFIG.SAVE_ERROR,
    fallbackMessage: "Erreur lors de la sauvegarde",
    logContext: { configId: input.id, url: input.url },
    requireUser: true,
    execute: async ({ userId }) => {
      const name = input.name.trim();
      const rawUrl = input.url.trim();

      if (!name || !rawUrl) {
        throw new ActionError(
          ERROR_CODES.CONFIG.SAVE_ERROR,
          {},
          "Nom et URL sont requis"
        );
      }

      if (!input.id && !input.token?.trim()) {
        throw new ActionError(
          ERROR_CODES.CONFIG.SAVE_ERROR,
          {},
          "Le token est requis pour une nouvelle config"
        );
      }

      let saved;
      try {
        saved = await saveConnection(
          {
            provider: "stripstream",
            id: input.id,
            name,
            url: rawUrl,
            token: input.token,
          },
          userId as number
        );
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new ActionError(
            ERROR_CODES.CONFIG.SAVE_ERROR,
            {},
            "Ce nom est déjà utilisé pour une autre config"
          );
        }
        throw error;
      }

      if (!saved) throw new ActionError(ERROR_CODES.CONFIG.NOT_FOUND, {}, "Configuration introuvable");

      return {
        message: input.id ? "Configuration mise à jour" : "Configuration créée",
        id: saved.id,
      };
    },
  });
}

export async function deleteStripstreamConfig(id: number): Promise<ActionResult> {
  return runAction({
    name: "deleteStripstreamConfig",
    fallbackCode: ERROR_CODES.CONFIG.DELETE_ERROR,
    fallbackMessage: "Erreur lors de la suppression",
    logContext: { configId: id },
    requireUser: true,
    execute: async ({ userId }) => {
      const deleted = await deleteConnection("stripstream", id, userId as number);
      if (!deleted) throw new ActionError(ERROR_CODES.CONFIG.NOT_FOUND, {}, "Configuration introuvable");
      return { message: "Configuration supprimée" };
    },
  });
}

/**
 * Teste une config Stripstream existante en utilisant le token stocké.
 */
export async function testStripstreamConfigById(id: number): Promise<ActionResult> {
  return runAction({
    name: "testStripstreamConfigById",
    fallbackCode: ERROR_CODES.CONFIG.TEST_ERROR,
    fallbackMessage: "Erreur lors du test de connexion",
    logContext: { configId: id },
    requireUser: true,
    rateLimit: STRIPSTREAM_TEST_RATE_LIMIT,
    execute: async ({ userId }) => {
      const result = await testStoredConnection("stripstream", id, userId as number);
      if (!result) throw new ActionError(ERROR_CODES.CONFIG.NOT_FOUND, {}, "Configuration introuvable");
      if (!result.ok) {
        throw new ActionError(
          ERROR_CODES.CONFIG.TEST_ERROR,
          {},
          result.error ?? "Connexion échouée"
        );
      }
      return { message: "Connexion Stripstream réussie !" };
    },
  });
}

export async function setActiveStripstreamConfig(id: number): Promise<ActionResult> {
  return runAction({
    name: "setActiveStripstreamConfig",
    fallbackCode: ERROR_CODES.CONFIG.ACTIVATE_ERROR,
    fallbackMessage: "Erreur lors du changement de config",
    logContext: { configId: id },
    requireUser: true,
    execute: async ({ userId }) => {
      const config = await activateConnection("stripstream", id, userId as number);
      if (!config) throw new ActionError(ERROR_CODES.CONFIG.NOT_FOUND, {}, "Configuration introuvable");
      return { message: `Stripstream actif : ${config.name}` };
    },
  });
}
