"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { StripstreamProvider } from "@/lib/providers/stripstream/stripstream.provider";
import { getResolvedStripstreamConfig } from "@/lib/providers/stripstream/stripstream-config-resolver";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import type { ProviderType } from "@/lib/providers/types";

/**
 * Sauvegarde la configuration Stripstream active. Si l'utilisateur n'en a pas encore,
 * en crée une nommée "Default" et la définit comme active.
 */
export async function saveStripstreamConfig(
  url: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Non authentifié" };
    }
    const userId = parseInt(user.id, 10);

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeStripstreamConfigId: true },
    });

    if (dbUser?.activeStripstreamConfigId) {
      await prisma.stripstreamConfig.update({
        where: { id: dbUser.activeStripstreamConfigId },
        data: { url, token },
      });
    } else {
      const config = await prisma.stripstreamConfig.create({
        data: { userId, name: "Default", url, token },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { activeStripstreamConfigId: config.id },
      });
    }

    revalidatePath("/settings");
    return { success: true, message: "Configuration Stripstream sauvegardée" };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Erreur lors de la sauvegarde" };
  }
}

/**
 * Teste la connexion à Stripstream Librarian
 */
export async function testStripstreamConnection(
  url: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  try {
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

/**
 * Définit le provider actif de l'utilisateur (type courant : komga ou stripstream).
 */
export async function setActiveProvider(
  provider: ProviderType
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Non authentifié" };
    }
    const userId = parseInt(user.id, 10);

    if (provider === "komga") {
      const hasConfig = await prisma.komgaConfig.findFirst({
        where: { userId },
        select: { id: true },
      });
      if (!hasConfig) {
        return { success: false, message: "Komga n'est pas encore configuré" };
      }
    } else if (provider === "stripstream") {
      const config = await getResolvedStripstreamConfig(userId);
      if (!config) {
        return { success: false, message: "Stripstream n'est pas encore configuré" };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { activeProvider: provider },
    });

    revalidatePath("/");
    revalidatePath("/settings");
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

/**
 * Récupère la configuration Stripstream active de l'utilisateur (affichage settings).
 * Priorité : config en base, sinon env STRIPSTREAM_URL / STRIPSTREAM_TOKEN.
 */
export async function getStripstreamConfig(): Promise<{
  url?: string;
  hasToken: boolean;
} | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    const userId = parseInt(user.id, 10);

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeStripstreamConfigId: true },
    });

    const resolved = await getResolvedStripstreamConfig(
      userId,
      dbUser?.activeStripstreamConfigId ?? undefined
    );
    if (!resolved) return null;
    return { url: resolved.url, hasToken: true };
  } catch {
    return null;
  }
}

/**
 * Récupère le provider actif de l'utilisateur
 */
export async function getActiveProvider(): Promise<ProviderType> {
  try {
    const user = await getCurrentUser();
    if (!user) return "komga";
    const userId = parseInt(user.id, 10);

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeProvider: true },
    });

    return (dbUser?.activeProvider as ProviderType) ?? "komga";
  } catch {
    return "komga";
  }
}

/**
 * Vérifie quels providers sont configurés (au moins une config existe).
 */
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

    const [dbUser, komgaConfig, stripstreamResolved] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { activeProvider: true } }),
      prisma.komgaConfig.findFirst({ where: { userId }, select: { id: true } }),
      getResolvedStripstreamConfig(userId),
    ]);

    return {
      komgaConfigured: !!komgaConfig,
      stripstreamConfigured: !!stripstreamResolved,
      activeProvider: (dbUser?.activeProvider as ProviderType) ?? "komga",
    };
  } catch {
    return { komgaConfigured: false, stripstreamConfigured: false, activeProvider: "komga" };
  }
}
