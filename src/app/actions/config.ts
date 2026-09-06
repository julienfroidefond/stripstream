"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import {
  FAVORITES_CACHE_TAG,
  HOME_CACHE_TAG,
  LIBRARY_SERIES_CACHE_TAG,
  SERIES_BOOKS_CACHE_TAG,
} from "@/constants/cacheConstants";
import { checkRateLimit } from "@/utils/rate-limit";
import { getActiveConnection, setActiveConnection } from "@/lib/active-connection";
import type { KomgaLibrary } from "@/types/komga";

const TEST_CONNECTION_LIMIT = 5;
const TEST_CONNECTION_WINDOW_MS = 30_000;

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

function buildAuthHeader(username: string, password: string): string {
  return Buffer.from(`${username}:${password}`).toString("base64");
}

async function requireUserId(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);
  return parseInt(user.id, 10);
}

function revalidateConnectionCaches() {
  revalidatePath("/settings");
  revalidatePath("/");
  revalidateTag(HOME_CACHE_TAG, "max");
  revalidateTag(LIBRARY_SERIES_CACHE_TAG, "max");
  revalidateTag(SERIES_BOOKS_CACHE_TAG, "max");
  revalidateTag(FAVORITES_CACHE_TAG, "max");
}

export async function testKomgaConnection(
  serverUrl: string,
  username: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const rl = checkRateLimit(`test-komga:${userId}`, {
      limit: TEST_CONNECTION_LIMIT,
      windowMs: TEST_CONNECTION_WINDOW_MS,
    });
    if (!rl.allowed) {
      return {
        success: false,
        message: `Trop de tentatives. Réessaie dans ${Math.ceil(rl.resetMs / 1000)}s.`,
      };
    }

    const authHeader = buildAuthHeader(username, password);
    const url = new URL(`${serverUrl}/api/v1/libraries`).toString();
    const headers = new Headers({
      Authorization: `Basic ${authHeader}`,
      Accept: "application/json",
    });

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new AppError(ERROR_CODES.KOMGA.CONNECTION_ERROR);
    }

    const libraries: KomgaLibrary[] = await response.json();
    return {
      success: true,
      message: `Connexion réussie ! ${libraries.length} bibliothèque${libraries.length > 1 ? "s" : ""} trouvée${libraries.length > 1 ? "s" : ""}`,
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
    const [configs, activeConnection] = await Promise.all([
      prisma.komgaConfig.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, url: true, username: true },
      }),
      getActiveConnection(userId),
    ]);
    return configs.map((c) => ({
      ...c,
      isActive: activeConnection.provider === "komga" && activeConnection.configId === c.id,
    }));
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
    const url = input.url.trim();
    const username = input.username.trim();

    if (!name || !url || !username) {
      return { success: false, message: "Nom, URL et identifiant sont requis" };
    }

    if (input.id) {
      const existing = await prisma.komgaConfig.findFirst({
        where: { id: input.id, userId },
        select: { id: true, authHeader: true },
      });
      if (!existing) {
        return { success: false, message: "Configuration introuvable" };
      }
      const authHeader = input.password
        ? buildAuthHeader(username, input.password)
        : existing.authHeader;
      await prisma.komgaConfig.update({
        where: { id: input.id },
        data: { name, url, username, authHeader },
      });
      revalidateConnectionCaches();
      return { success: true, message: "Configuration mise à jour", id: input.id };
    }

    if (!input.password) {
      return { success: false, message: "Le mot de passe est requis pour une nouvelle config" };
    }

    const authHeader = buildAuthHeader(username, input.password);
    const created = await prisma.komgaConfig.create({
      data: { userId, name, url, username, authHeader },
    });

    revalidateConnectionCaches();
    return { success: true, message: "Configuration créée", id: created.id };
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
    const config = await prisma.komgaConfig.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!config) return { success: false, message: "Configuration introuvable" };

    await prisma.komgaConfig.delete({ where: { id } });

    revalidateConnectionCaches();
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
    const rl = checkRateLimit(`test-komga:${userId}`, {
      limit: TEST_CONNECTION_LIMIT,
      windowMs: TEST_CONNECTION_WINDOW_MS,
    });
    if (!rl.allowed) {
      return {
        success: false,
        message: `Trop de tentatives. Réessaie dans ${Math.ceil(rl.resetMs / 1000)}s.`,
      };
    }
    const config = await prisma.komgaConfig.findFirst({
      where: { id, userId },
      select: { url: true, authHeader: true },
    });
    if (!config) return { success: false, message: "Configuration introuvable" };

    const url = new URL(`${config.url}/api/v1/libraries`).toString();
    const headers = new Headers({
      Authorization: `Basic ${config.authHeader}`,
      Accept: "application/json",
    });
    const response = await fetch(url, { headers });
    if (!response.ok) {
      return { success: false, message: `Connexion échouée (${response.status})` };
    }
    const libraries: KomgaLibrary[] = await response.json();
    return {
      success: true,
      message: `Connexion réussie ! ${libraries.length} bibliothèque${libraries.length > 1 ? "s" : ""}`,
    };
  } catch {
    return { success: false, message: "Erreur lors du test de connexion" };
  }
}

export async function setActiveKomgaConfig(
  id: number
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const config = await prisma.komgaConfig.findFirst({
      where: { id, userId },
      select: { id: true, name: true },
    });
    if (!config) return { success: false, message: "Configuration introuvable" };

    await setActiveConnection("komga", id);

    // Refresh the page segment for the new cookie, but keep provider data warm:
    // cache keys are already scoped to the selected connection.
    revalidatePath("/");
    return { success: true, message: `Komga actif : ${config.name}` };
  } catch {
    return { success: false, message: "Erreur lors du changement de config" };
  }
}
