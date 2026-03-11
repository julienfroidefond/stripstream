import prisma from "@/lib/prisma";

export interface ResolvedStripstreamConfig {
  url: string;
  token: string;
  source: "db" | "env";
}

/**
 * Résout la config Stripstream : d'abord en base (par utilisateur), sinon depuis les env STRIPSTREAM_URL et STRIPSTREAM_TOKEN.
 */
export async function getResolvedStripstreamConfig(
  userId: number
): Promise<ResolvedStripstreamConfig | null> {
  const fromDb = await prisma.stripstreamConfig.findUnique({
    where: { userId },
    select: { url: true, token: true },
  });
  if (fromDb) return { ...fromDb, source: "db" };

  const url = process.env.STRIPSTREAM_URL?.trim();
  const token = process.env.STRIPSTREAM_TOKEN?.trim();
  if (url && token) return { url, token, source: "env" };

  return null;
}
