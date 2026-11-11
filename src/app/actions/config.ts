"use server";

import { requireUserId } from "@/lib/auth-utils";
import {
  CONNECTION_TEST_RATE_LIMIT,
  activateConnection,
  connectionFromKomgaCredentials,
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

export interface KomgaConfigSummary {
  id: number;
  name: string;
  url: string;
  username: string;
  isActive: boolean;
}

interface SaveKomgaInput {
  id?: number;
  name: string;
  url: string;
  username: string;
  password?: string;
}

const KOMGA_TEST_RATE_LIMIT = {
  key: ({ userId }: { userId: number }) => connectionTestRateLimitKey("komga", userId),
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

function connectionSuccessMessage(libraryCount: number): string {
  return `Connexion réussie ! ${libraryCount} bibliothèque${
    libraryCount > 1 ? "s" : ""
  } trouvée${libraryCount > 1 ? "s" : ""}`;
}

export async function testKomgaConnection(
  serverUrl: string,
  username: string,
  password: string
): Promise<ActionResult> {
  return runAction({
    name: "testKomgaConnection",
    fallbackCode: ERROR_CODES.CONFIG.TEST_ERROR,
    fallbackMessage: "Erreur lors de la connexion",
    logContext: { serverUrl, username },
    requireUser: true,
    rateLimit: KOMGA_TEST_RATE_LIMIT,
    execute: async () => {
      const result = await testConnection(
        connectionFromKomgaCredentials(serverUrl, username, password)
      );
      if (!result.ok) {
        throw new ActionError(
          ERROR_CODES.CONFIG.TEST_ERROR,
          {},
          result.error ?? "Erreur lors de la connexion"
        );
      }

      return { message: connectionSuccessMessage(result.libraryCount ?? 0) };
    },
  });
}

export async function listKomgaConfigs(): Promise<KomgaConfigSummary[]> {
  try {
    const userId = await requireUserId();
    return (await listConnections(userId)).komga;
  } catch {
    return [];
  }
}

/**
 * Crée ou met à jour une config Komga.
 * - Sans `id` → création. Si c'est la 1re config du user, devient automatiquement active.
 * - Avec `id` → update. Si `password` est vide, le mot de passe existant est conservé.
 */
export async function saveKomgaConfig(
  input: SaveKomgaInput
): Promise<ActionResult<{ id: number }>> {
  return runAction<{ id: number }>({
    name: "saveKomgaConfig",
    fallbackCode: ERROR_CODES.CONFIG.SAVE_ERROR,
    fallbackMessage: "Erreur lors de la sauvegarde",
    logContext: { configId: input.id, url: input.url },
    requireUser: true,
    execute: async ({ userId }) => {
      const name = input.name.trim();
      const rawUrl = input.url.trim();
      const username = input.username.trim();

      if (!name || !rawUrl || !username) {
        throw new ActionError(
          ERROR_CODES.CONFIG.SAVE_ERROR,
          {},
          "Nom, URL et identifiant sont requis"
        );
      }

      if (!input.id && !input.password) {
        throw new ActionError(
          ERROR_CODES.CONFIG.SAVE_ERROR,
          {},
          "Le mot de passe est requis pour une nouvelle config"
        );
      }

      let saved;
      try {
        saved = await saveConnection(
          {
            provider: "komga",
            id: input.id,
            name,
            url: rawUrl,
            username,
            password: input.password,
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

export async function deleteKomgaConfig(id: number): Promise<ActionResult> {
  return runAction({
    name: "deleteKomgaConfig",
    fallbackCode: ERROR_CODES.CONFIG.DELETE_ERROR,
    fallbackMessage: "Erreur lors de la suppression",
    logContext: { configId: id },
    requireUser: true,
    execute: async ({ userId }) => {
      const deleted = await deleteConnection("komga", id, userId as number);
      if (!deleted) throw new ActionError(ERROR_CODES.CONFIG.NOT_FOUND, {}, "Configuration introuvable");
      return { message: "Configuration supprimée" };
    },
  });
}

/**
 * Teste une config Komga existante en utilisant les credentials stockés.
 */
export async function testKomgaConfigById(id: number): Promise<ActionResult> {
  return runAction({
    name: "testKomgaConfigById",
    fallbackCode: ERROR_CODES.CONFIG.TEST_ERROR,
    fallbackMessage: "Erreur lors du test de connexion",
    logContext: { configId: id },
    requireUser: true,
    rateLimit: KOMGA_TEST_RATE_LIMIT,
    execute: async ({ userId }) => {
      const result = await testStoredConnection("komga", id, userId as number);
      if (!result) throw new ActionError(ERROR_CODES.CONFIG.NOT_FOUND, {}, "Configuration introuvable");
      if (!result.ok) {
        throw new ActionError(
          ERROR_CODES.CONFIG.TEST_ERROR,
          {},
          result.error ?? "Erreur lors du test de connexion"
        );
      }

      return { message: connectionSuccessMessage(result.libraryCount ?? 0) };
    },
  });
}

export async function setActiveKomgaConfig(id: number): Promise<ActionResult> {
  return runAction({
    name: "setActiveKomgaConfig",
    fallbackCode: ERROR_CODES.CONFIG.ACTIVATE_ERROR,
    fallbackMessage: "Erreur lors du changement de config",
    logContext: { configId: id },
    requireUser: true,
    execute: async ({ userId }) => {
      const config = await activateConnection("komga", id, userId as number);
      if (!config) throw new ActionError(ERROR_CODES.CONFIG.NOT_FOUND, {}, "Configuration introuvable");
      return { message: `Komga actif : ${config.name}` };
    },
  });
}
