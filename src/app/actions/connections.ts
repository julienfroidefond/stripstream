"use server";

import * as connections from "@/lib/connections";
import {
  validateConnectionDraft,
  validateConnectionRef,
  type ConnectionValidation,
} from "@/lib/connections/descriptors";
import type {
  ConnectionInput,
  ConnectionLists,
  ConnectionRef,
  ConnectionTestTarget,
  ResolvedConnection,
} from "@/lib/connections";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ActionError, runAction, type ActionResult } from "@/lib/actions/action-runner";

/**
 * Actions de connexion génériques (ADR 0030). Une seule action par opération,
 * discriminée par `provider` : ce qui diffère d'un provider à l'autre (champs,
 * secret, table, sonde) est porté par son descripteur et sa définition, jamais
 * par une action dédiée. Les arguments viennent du client : ils sont validés
 * avant tout accès, et chaque échec porte un code du catalogue. `message` est
 * une chaîne technique (logs) ; le client traduit `errors.${code}`.
 */

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function requireValid<T>(validation: ConnectionValidation<T>): T {
  if (!validation.ok) throw new ActionError(validation.code);
  return validation.value;
}

/** Configs du user, une liste par provider, avec la sélection du navigateur. */
export async function listConnections(): Promise<ActionResult<{ lists: ConnectionLists }>> {
  return runAction<{ lists: ConnectionLists }>({
    name: "listConnections",
    fallbackCode: ERROR_CODES.CONFIG.FETCH_ERROR,
    requireUser: true,
    execute: async ({ userId }) => ({
      message: "Connections listed",
      lists: await connections.listConnections(userId),
    }),
  });
}

/**
 * Crée (sans `id`) ou met à jour (avec `id`) une config. Un secret vide en mise
 * à jour conserve la valeur enregistrée.
 */
export async function saveConnection(
  input: ConnectionInput
): Promise<ActionResult<{ id: number; created: boolean }>> {
  return runAction<{ id: number; created: boolean }>({
    name: "saveConnection",
    fallbackCode: ERROR_CODES.CONFIG.SAVE_ERROR,
    logContext: { provider: input?.provider, configId: input?.id, url: input?.url },
    requireUser: true,
    execute: async ({ userId }) => {
      let saved;
      try {
        saved = await connections.saveConnection(input, userId);
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new ActionError(ERROR_CODES.CONFIG.DUPLICATE_NAME);
        }
        throw error;
      }
      if (!saved) throw new ActionError(ERROR_CODES.CONFIG.NOT_FOUND);

      const created = input.id === undefined;
      return {
        message: created ? "Connection created" : "Connection updated",
        id: saved.id,
        created,
      };
    },
  });
}

export async function deleteConnection(target: ConnectionRef): Promise<ActionResult> {
  return runAction({
    name: "deleteConnection",
    fallbackCode: ERROR_CODES.CONFIG.DELETE_ERROR,
    logContext: { provider: target?.provider, configId: target?.id },
    requireUser: true,
    execute: async ({ userId }) => {
      const { provider, id } = requireValid(validateConnectionRef(target));
      const deleted = await connections.deleteConnection(provider, id, userId);
      if (!deleted) throw new ActionError(ERROR_CODES.CONFIG.NOT_FOUND);
      return { message: "Connection deleted" };
    },
  });
}

/**
 * Sélectionne une config pour ce navigateur. Le client recharge ensuite toute
 * la page (`useActivateConnection`) : les segments RSC déjà rendus dépendent de
 * l'ancien cookie.
 */
export async function activateConnection(
  target: ConnectionRef
): Promise<ActionResult<{ name: string }>> {
  return runAction<{ name: string }>({
    name: "activateConnection",
    fallbackCode: ERROR_CODES.CONFIG.ACTIVATE_ERROR,
    logContext: { provider: target?.provider, configId: target?.id },
    requireUser: true,
    execute: async ({ userId }) => {
      const { provider, id } = requireValid(validateConnectionRef(target));
      const config = await connections.activateConnection(provider, id, userId);
      if (!config) throw new ActionError(ERROR_CODES.CONFIG.NOT_FOUND);
      return { message: `Connection activated: ${config.name}`, name: config.name };
    },
  });
}

function parseTestTarget(
  target: ConnectionTestTarget
): ConnectionValidation<{ stored: ConnectionRef } | { draft: connections.ConnectionDraft }> {
  if (target && typeof target === "object" && "stored" in target) {
    const stored = validateConnectionRef(target.stored);
    return stored.ok ? { ok: true, value: { stored: stored.value } } : stored;
  }
  if (target && typeof target === "object" && "draft" in target) {
    const draft = validateConnectionDraft(target.draft);
    return draft.ok ? { ok: true, value: { draft: draft.value } } : draft;
  }
  return { ok: false, code: ERROR_CODES.CONFIG.INVALID_INPUT };
}

/**
 * Teste une config enregistrée (`{ stored }`) ou des credentials saisis
 * (`{ draft }`). Action sensible : session requise et budget de tentatives par
 * provider et par user (ADR 0023), compté avant toute requête sortante, y
 * compris pour une cible invalide.
 */
export async function testConnection(
  target: ConnectionTestTarget
): Promise<ActionResult<{ libraryCount: number }>> {
  const parsed = parseTestTarget(target);
  const provider = parsed.ok
    ? "stored" in parsed.value
      ? parsed.value.stored.provider
      : parsed.value.draft.provider
    : null;

  return runAction<{ libraryCount: number }>({
    name: "testConnection",
    fallbackCode: ERROR_CODES.CONFIG.TEST_ERROR,
    logContext: {
      provider,
      configId: parsed.ok && "stored" in parsed.value ? parsed.value.stored.id : undefined,
      url: parsed.ok && "draft" in parsed.value ? parsed.value.draft.url : undefined,
    },
    requireUser: true,
    rateLimit: {
      key: ({ userId }) =>
        provider
          ? connections.connectionTestRateLimitKey(provider, userId)
          : `test-invalid:${userId}`,
      ...connections.CONNECTION_TEST_RATE_LIMIT,
      code: ERROR_CODES.AUTH.RATE_LIMITED,
    },
    execute: async ({ userId }) => {
      const value = requireValid(parsed);
      let result: connections.ConnectionTestResult | null;
      if ("stored" in value) {
        result = await connections.testStoredConnection(
          value.stored.provider,
          value.stored.id,
          userId
        );
      } else {
        const connection: ResolvedConnection = connections.connectionFromDraft(value.draft);
        result = await connections.testConnection(connection);
      }

      if (!result) throw new ActionError(ERROR_CODES.CONFIG.NOT_FOUND);
      if (!result.ok) {
        throw new ActionError(
          result.code ?? ERROR_CODES.CONFIG.TEST_ERROR,
          {},
          result.error ?? "Connection test failed"
        );
      }

      const libraryCount = result.libraryCount ?? 0;
      return { message: `Connection succeeded: ${libraryCount} libraries`, libraryCount };
    },
  });
}
