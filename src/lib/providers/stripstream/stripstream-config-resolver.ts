import prisma from "@/lib/prisma";

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
    if (config) return { ...config, source: "db" };
  }

  const fallback = await prisma.stripstreamConfig.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { url: true, token: true },
  });
  if (fallback) return { ...fallback, source: "db" };

  const url = process.env.STRIPSTREAM_URL?.trim();
  const token = process.env.STRIPSTREAM_TOKEN?.trim();
  if (url && token) return { url, token, source: "env" };

  return null;
}
