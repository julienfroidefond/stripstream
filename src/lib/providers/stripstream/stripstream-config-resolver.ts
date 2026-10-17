import prisma from "@/lib/prisma";
import { decryptSecret } from "@/lib/credentials";

export interface ResolvedStripstreamConfig {
  url: string;
  token: string;
  source: "db" | "env";
}

/**
 * Résout la config Stripstream :
 *   1) `activeId` si fourni et appartient au user → utilise cette config
 *   2) sinon, première config disponible du user
 *   3) sinon, fallback aux variables d'env STRIPSTREAM_URL / STRIPSTREAM_TOKEN
 *
 * Les tokens issus de la base sont déchiffrés (voir `src/lib/credentials.ts`) ;
 * ceux issus des variables d'environnement restent en clair (hors base).
 */
export async function getResolvedStripstreamConfig(
  userId: number,
  activeId?: number
): Promise<ResolvedStripstreamConfig | null> {
  if (activeId) {
    const config = await prisma.stripstreamConfig.findFirst({
      where: { id: activeId, userId },
      select: { url: true, token: true },
    });
    if (config) return { ...config, token: decryptSecret(config.token), source: "db" };
  }

  const fallback = await prisma.stripstreamConfig.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { url: true, token: true },
  });
  if (fallback) return { ...fallback, token: decryptSecret(fallback.token), source: "db" };

  const url = process.env.STRIPSTREAM_URL?.trim();
  const token = process.env.STRIPSTREAM_TOKEN?.trim();
  if (url && token) return { url, token, source: "env" };

  return null;
}
