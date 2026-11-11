"use server";

import { requireUserId } from "@/lib/auth-utils";
import {
  activateConnection,
  checkConnectionTestRateLimit,
  connectionFromStripstreamToken,
  deleteConnection,
  listConnections,
  saveConnection,
  testConnection,
  testStoredConnection,
} from "@/lib/connections";
import { AppError } from "@/utils/errors";

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

function rateLimitedMessage(retryAfterSeconds: number): string {
  return `Trop de tentatives. Réessaie dans ${retryAfterSeconds}s.`;
}

export async function testStripstreamConnection(
  url: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const rateLimit = checkConnectionTestRateLimit("stripstream", userId);
    if (!rateLimit.allowed) {
      return { success: false, message: rateLimitedMessage(rateLimit.retryAfterSeconds) };
    }

    const result = await testConnection(connectionFromStripstreamToken(url, token));
    if (!result.ok) {
      return { success: false, message: result.error ?? "Connexion échouée" };
    }
    return { success: true, message: "Connexion Stripstream réussie !" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors du test de connexion" };
  }
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
): Promise<{ success: boolean; message: string; id?: number }> {
  try {
    const userId = await requireUserId();
    const name = input.name.trim();
    const rawUrl = input.url.trim();

    if (!name || !rawUrl) {
      return { success: false, message: "Nom et URL sont requis" };
    }

    if (!input.id && !input.token?.trim()) {
      return { success: false, message: "Le token est requis pour une nouvelle config" };
    }

    const saved = await saveConnection(
      {
        provider: "stripstream",
        id: input.id,
        name,
        url: rawUrl,
        token: input.token,
      },
      userId
    );
    if (!saved) return { success: false, message: "Configuration introuvable" };

    return {
      success: true,
      message: input.id ? "Configuration mise à jour" : "Configuration créée",
      id: saved.id,
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { success: false, message: "Ce nom est déjà utilisé pour une autre config" };
    }
    return { success: false, message: "Erreur lors de la sauvegarde" };
  }
}

export async function deleteStripstreamConfig(
  id: number
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const deleted = await deleteConnection("stripstream", id, userId);
    if (!deleted) return { success: false, message: "Configuration introuvable" };
    return { success: true, message: "Configuration supprimée" };
  } catch {
    return { success: false, message: "Erreur lors de la suppression" };
  }
}

/**
 * Teste une config Stripstream existante en utilisant le token stocké.
 */
export async function testStripstreamConfigById(
  id: number
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const rateLimit = checkConnectionTestRateLimit("stripstream", userId);
    if (!rateLimit.allowed) {
      return { success: false, message: rateLimitedMessage(rateLimit.retryAfterSeconds) };
    }

    const result = await testStoredConnection("stripstream", id, userId);
    if (!result) return { success: false, message: "Configuration introuvable" };
    if (!result.ok) {
      return { success: false, message: result.error ?? "Connexion échouée" };
    }
    return { success: true, message: "Connexion Stripstream réussie !" };
  } catch {
    return { success: false, message: "Erreur lors du test de connexion" };
  }
}

export async function setActiveStripstreamConfig(
  id: number
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const config = await activateConnection("stripstream", id, userId);
    if (!config) return { success: false, message: "Configuration introuvable" };
    return { success: true, message: `Stripstream actif : ${config.name}` };
  } catch {
    return { success: false, message: "Erreur lors du changement de config" };
  }
}
