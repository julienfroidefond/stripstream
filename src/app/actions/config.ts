"use server";

import { requireUserId } from "@/lib/auth-utils";
import {
  activateConnection,
  checkConnectionTestRateLimit,
  connectionFromKomgaCredentials,
  deleteConnection,
  listConnections,
  saveConnection,
  testConnection,
  testStoredConnection,
} from "@/lib/connections";
import { AppError } from "@/utils/errors";

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

function rateLimitedMessage(retryAfterSeconds: number): string {
  return `Trop de tentatives. Réessaie dans ${retryAfterSeconds}s.`;
}

export async function testKomgaConnection(
  serverUrl: string,
  username: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const rateLimit = checkConnectionTestRateLimit("komga", userId);
    if (!rateLimit.allowed) {
      return { success: false, message: rateLimitedMessage(rateLimit.retryAfterSeconds) };
    }

    const result = await testConnection(
      connectionFromKomgaCredentials(serverUrl, username, password)
    );
    if (!result.ok) {
      return { success: false, message: result.error ?? "Erreur lors de la connexion" };
    }

    const count = result.libraryCount ?? 0;
    return {
      success: true,
      message: `Connexion réussie ! ${count} bibliothèque${count > 1 ? "s" : ""} trouvée${count > 1 ? "s" : ""}`,
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la connexion" };
  }
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
): Promise<{ success: boolean; message: string; id?: number }> {
  try {
    const userId = await requireUserId();
    const name = input.name.trim();
    const rawUrl = input.url.trim();
    const username = input.username.trim();

    if (!name || !rawUrl || !username) {
      return { success: false, message: "Nom, URL et identifiant sont requis" };
    }

    if (!input.id && !input.password) {
      return { success: false, message: "Le mot de passe est requis pour une nouvelle config" };
    }

    const saved = await saveConnection(
      {
        provider: "komga",
        id: input.id,
        name,
        url: rawUrl,
        username,
        password: input.password,
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

export async function deleteKomgaConfig(
  id: number
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const deleted = await deleteConnection("komga", id, userId);
    if (!deleted) return { success: false, message: "Configuration introuvable" };
    return { success: true, message: "Configuration supprimée" };
  } catch {
    return { success: false, message: "Erreur lors de la suppression" };
  }
}

/**
 * Teste une config Komga existante en utilisant les credentials stockés.
 */
export async function testKomgaConfigById(
  id: number
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const rateLimit = checkConnectionTestRateLimit("komga", userId);
    if (!rateLimit.allowed) {
      return { success: false, message: rateLimitedMessage(rateLimit.retryAfterSeconds) };
    }

    const result = await testStoredConnection("komga", id, userId);
    if (!result) return { success: false, message: "Configuration introuvable" };
    if (!result.ok) {
      return { success: false, message: result.error ?? "Erreur lors du test de connexion" };
    }

    const count = result.libraryCount ?? 0;
    return {
      success: true,
      message: `Connexion réussie ! ${count} bibliothèque${count > 1 ? "s" : ""} trouvée${count > 1 ? "s" : ""}`,
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors du test de connexion" };
  }
}

export async function setActiveKomgaConfig(
  id: number
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const config = await activateConnection("komga", id, userId);
    if (!config) return { success: false, message: "Configuration introuvable" };
    return { success: true, message: `Komga actif : ${config.name}` };
  } catch {
    return { success: false, message: "Erreur lors du changement de config" };
  }
}
