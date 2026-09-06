"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { StripstreamProvider } from "@/lib/providers/stripstream/stripstream.provider";
import { getResolvedStripstreamConfig } from "@/lib/providers/stripstream/stripstream-config-resolver";
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

const TEST_CONNECTION_LIMIT = 5;
const TEST_CONNECTION_WINDOW_MS = 30_000;
import type { ProviderType } from "@/lib/providers/types";

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

export async function testStripstreamConnection(
  url: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const rl = checkRateLimit(`test-stripstream:${userId}`, {
      limit: TEST_CONNECTION_LIMIT,
      windowMs: TEST_CONNECTION_WINDOW_MS,
    });
    if (!rl.allowed) {
      return {
        success: false,
        message: `Trop de tentatives. Réessaie dans ${Math.ceil(rl.resetMs / 1000)}s.`,
      };
    }

    const provider = new StripstreamProvider(url, token);
    const result = await provider.testConnection();
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
    const [configs, activeConnection] = await Promise.all([
      prisma.stripstreamConfig.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, url: true },
      }),
      getActiveConnection(userId),
    ]);
    return configs.map((c) => ({
      ...c,
      isActive: activeConnection.provider === "stripstream" && activeConnection.configId === c.id,
    }));
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
    const url = input.url.trim();

    if (!name || !url) {
      return { success: false, message: "Nom et URL sont requis" };
    }

    if (input.id) {
      const existing = await prisma.stripstreamConfig.findFirst({
        where: { id: input.id, userId },
        select: { id: true, token: true },
      });
      if (!existing) {
        return { success: false, message: "Configuration introuvable" };
      }
      const token = input.token?.trim() || existing.token;
      await prisma.stripstreamConfig.update({
        where: { id: input.id },
        data: { name, url, token },
      });
      revalidateConnectionCaches();
      return { success: true, message: "Configuration mise à jour", id: input.id };
    }

    if (!input.token?.trim()) {
      return { success: false, message: "Le token est requis pour une nouvelle config" };
    }

    const created = await prisma.stripstreamConfig.create({
      data: { userId, name, url, token: input.token.trim() },
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

export async function deleteStripstreamConfig(
  id: number
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();
    const config = await prisma.stripstreamConfig.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!config) return { success: false, message: "Configuration introuvable" };

    await prisma.stripstreamConfig.delete({ where: { id } });

    revalidateConnectionCaches();
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
    const rl = checkRateLimit(`test-stripstream:${userId}`, {
      limit: TEST_CONNECTION_LIMIT,
      windowMs: TEST_CONNECTION_WINDOW_MS,
    });
    if (!rl.allowed) {
      return {
        success: false,
        message: `Trop de tentatives. Réessaie dans ${Math.ceil(rl.resetMs / 1000)}s.`,
      };
    }
    const config = await prisma.stripstreamConfig.findFirst({
      where: { id, userId },
      select: { url: true, token: true },
    });
    if (!config) return { success: false, message: "Configuration introuvable" };

    const provider = new StripstreamProvider(config.url, config.token);
    const result = await provider.testConnection();
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
    const config = await prisma.stripstreamConfig.findFirst({
      where: { id, userId },
      select: { id: true, name: true },
    });
    if (!config) return { success: false, message: "Configuration introuvable" };

    await setActiveConnection("stripstream", id);

    // Refresh the page segment for the new cookie, but keep provider data warm:
    // cache keys are already scoped to the selected connection.
    revalidatePath("/");
    return { success: true, message: `Stripstream actif : ${config.name}` };
  } catch {
    return { success: false, message: "Erreur lors du changement de config" };
  }
}

/**
 * Définit le type de provider actif (komga ou stripstream).
 */
export async function setActiveProvider(
  provider: ProviderType
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await requireUserId();

    if (provider === "komga") {
      const config = await prisma.komgaConfig.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (!config) {
        return { success: false, message: "Komga n'est pas encore configuré" };
      }
      await setActiveConnection("komga", config.id);
    } else if (provider === "stripstream") {
      const config = await prisma.stripstreamConfig.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (!config) {
        return { success: false, message: "Stripstream n'est pas encore configuré" };
      }
      await setActiveConnection("stripstream", config.id);
    }

    revalidateConnectionCaches();
    return {
      success: true,
      message: `Provider actif : ${provider === "komga" ? "Komga" : "Stripstream Librarian"}`,
    };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors du changement de provider" };
  }
}

export async function getActiveProvider(): Promise<ProviderType> {
  try {
    const user = await getCurrentUser();
    if (!user) return "komga";
    const userId = parseInt(user.id, 10);

    return (await getActiveConnection(userId)).provider;
  } catch {
    return "komga";
  }
}

export async function getProvidersStatus(): Promise<{
  komgaConfigured: boolean;
  stripstreamConfigured: boolean;
  activeProvider: ProviderType;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { komgaConfigured: false, stripstreamConfigured: false, activeProvider: "komga" };
    }
    const userId = parseInt(user.id, 10);

    const [activeConnection, komgaConfig, stripstreamResolved] = await Promise.all([
      getActiveConnection(userId),
      prisma.komgaConfig.findFirst({ where: { userId }, select: { id: true } }),
      getResolvedStripstreamConfig(userId),
    ]);

    return {
      komgaConfigured: !!komgaConfig,
      stripstreamConfigured: !!stripstreamResolved,
      activeProvider: activeConnection.provider,
    };
  } catch {
    return { komgaConfigured: false, stripstreamConfigured: false, activeProvider: "komga" };
  }
}
