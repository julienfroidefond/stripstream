import prisma from "@/lib/prisma";
import { buildKomgaAuthHeader, encryptSecret } from "@/lib/credentials";
import { invalidateConnectionChange } from "@/lib/cache/invalidation";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { normalizeServerUrl } from "@/utils/server-url";
import { getActiveConnection, setActiveConnection } from "./active";
import type {
  ConnectionLists,
  SaveConnectionInput,
} from "./types";

/**
 * Lecture des deux listes en un appel. L'état actif vient de la sélection
 * navigateur ; aucune colonne serveur ne porte plus cette information.
 */
export async function listConnections(userId: number): Promise<ConnectionLists> {
  const [komgaConfigs, stripstreamConfigs, activeConnection] = await Promise.all([
    prisma.komgaConfig.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, url: true, username: true },
    }),
    prisma.stripstreamConfig.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, url: true },
    }),
    getActiveConnection(userId),
  ]);

  return {
    komga: komgaConfigs.map((config) => ({
      ...config,
      isActive:
        activeConnection.provider === "komga" && activeConnection.configId === config.id,
    })),
    stripstream: stripstreamConfigs.map((config) => ({
      ...config,
      isActive:
        activeConnection.provider === "stripstream" &&
        activeConnection.configId === config.id,
    })),
  };
}

/**
 * Crée ou met à jour une config. Le secret est toujours chiffré ici : aucun
 * appelant ne manipule la colonne `authHeader` / `token` en clair.
 *
 * - Sans `id` : création. Une config absente de cookie reste utilisable via le
 *   fallback « première config » de `resolve`.
 * - Avec `id` : mise à jour. Un secret vide conserve la valeur existante.
 *
 * Retourne `null` si la config à mettre à jour n'appartient pas au user.
 */
export async function saveConnection(
  input: SaveConnectionInput,
  userId: number
): Promise<{ id: number } | null> {
  const name = input.name.trim();
  const url = normalizeServerUrl(input.url.trim());
  if (!name) throw new AppError(ERROR_CODES.CONFIG.SAVE_ERROR);

  if (input.provider === "komga") {
    const username = input.username.trim();
    if (!username) throw new AppError(ERROR_CODES.CONFIG.SAVE_ERROR);

    if (input.id) {
      const existing = await prisma.komgaConfig.findFirst({
        where: { id: input.id, userId },
        select: { authHeader: true },
      });
      if (!existing) return null;

      const authHeader = input.password
        ? encryptSecret(buildKomgaAuthHeader(username, input.password))
        : existing.authHeader;

      await prisma.komgaConfig.update({
        where: { id: input.id },
        data: { name, url, username, authHeader },
      });
      invalidateConnectionChange();
      return { id: input.id };
    }

    if (!input.password) throw new AppError(ERROR_CODES.CONFIG.SAVE_ERROR);

    const created = await prisma.komgaConfig.create({
      data: {
        userId,
        name,
        url,
        username,
        authHeader: encryptSecret(buildKomgaAuthHeader(username, input.password)),
      },
    });
    invalidateConnectionChange();
    return { id: created.id };
  }

  if (input.id) {
    const existing = await prisma.stripstreamConfig.findFirst({
      where: { id: input.id, userId },
      select: { token: true },
    });
    if (!existing) return null;

    const tokenInput = input.token?.trim();
    const token = tokenInput ? encryptSecret(tokenInput) : existing.token;

    await prisma.stripstreamConfig.update({
      where: { id: input.id },
      data: { name, url, token },
    });
    invalidateConnectionChange();
    return { id: input.id };
  }

  const tokenInput = input.token?.trim();
  if (!tokenInput) throw new AppError(ERROR_CODES.CONFIG.SAVE_ERROR);

  const created = await prisma.stripstreamConfig.create({
    data: { userId, name, url, token: encryptSecret(tokenInput) },
  });
  invalidateConnectionChange();
  return { id: created.id };
}

/** Supprime une config possédée par le user. Retourne `false` si elle n'existe pas. */
export async function deleteConnection(
  provider: "komga" | "stripstream",
  id: number,
  userId: number
): Promise<boolean> {
  if (provider === "komga") {
    const config = await prisma.komgaConfig.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!config) return false;
    await prisma.komgaConfig.delete({ where: { id } });
  } else {
    const config = await prisma.stripstreamConfig.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!config) return false;
    await prisma.stripstreamConfig.delete({ where: { id } });
  }

  invalidateConnectionChange();
  return true;
}

/**
 * Sélectionne une config et expire les données dérivées de l'ancienne. Les
 * cookies restent la source de sélection ; la DB ne fournit que les détails.
 */
export async function activateConnection(
  provider: "komga" | "stripstream",
  id: number,
  userId: number
): Promise<{ id: number; name: string } | null> {
  const config =
    provider === "komga"
      ? await prisma.komgaConfig.findFirst({
          where: { id, userId },
          select: { id: true, name: true },
        })
      : await prisma.stripstreamConfig.findFirst({
          where: { id, userId },
          select: { id: true, name: true },
        });

  if (!config) return null;

  await setActiveConnection(provider, id);
  invalidateConnectionChange();
  return config;
}
