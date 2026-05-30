import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { getResolvedStripstreamConfig } from "./stripstream/stripstream-config-resolver";
import type { IMediaProvider } from "./provider.interface";
import type { StripstreamReadingListDetail } from "@/types/stripstream";

export async function getProvider(): Promise<IMediaProvider | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const userId = parseInt(user.id, 10);

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      activeProvider: true,
      activeKomgaConfigId: true,
      activeStripstreamConfigId: true,
    },
  });

  if (!dbUser) return null;

  const activeProvider = dbUser.activeProvider ?? "komga";

  if (activeProvider === "stripstream") {
    const resolved = await getResolvedStripstreamConfig(
      userId,
      dbUser.activeStripstreamConfigId ?? undefined
    );
    if (resolved) {
      const { StripstreamProvider } = await import("./stripstream/stripstream.provider");
      return new StripstreamProvider(resolved.url, resolved.token);
    }
  }

  if (activeProvider === "komga" || !dbUser.activeProvider) {
    const config = await resolveActiveKomgaConfig(userId, dbUser.activeKomgaConfigId);
    if (!config) return null;
    const { KomgaProvider } = await import("./komga/komga.provider");
    return new KomgaProvider(config.url, config.authHeader);
  }

  return null;
}

export async function getActiveProviderType(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const userId = parseInt(user.id, 10);
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeProvider: true },
  });

  return dbUser?.activeProvider ?? "komga";
}

/**
 * Fetches the detail of a reading list (Stripstream-only feature).
 * Returns null if the active provider is not Stripstream or the user is not authenticated.
 */
export async function fetchReadingListDetail(id: string): Promise<StripstreamReadingListDetail | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const userId = parseInt(user.id, 10);
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeProvider: true, activeStripstreamConfigId: true },
  });

  if (!dbUser || dbUser.activeProvider !== "stripstream") return null;

  const resolved = await getResolvedStripstreamConfig(
    userId,
    dbUser.activeStripstreamConfigId ?? undefined
  );
  if (!resolved) return null;

  const { StripstreamProvider } = await import("./stripstream/stripstream.provider");
  const provider = new StripstreamProvider(resolved.url, resolved.token);
  return provider.getReadingListDetail(id);
}

/**
 * Récupère la config Komga active. Si activeId est fourni et existe, on la prend ;
 * sinon on retombe sur la première config du user (cas d'un user qui n'a pas encore
 * choisi explicitement une config active mais en possède au moins une).
 */
async function resolveActiveKomgaConfig(
  userId: number,
  activeId: number | null
): Promise<{ url: string; authHeader: string } | null> {
  if (activeId) {
    const config = await prisma.komgaConfig.findFirst({
      where: { id: activeId, userId },
      select: { url: true, authHeader: true },
    });
    if (config) return config;
  }

  // Fallback : première config disponible
  return prisma.komgaConfig.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { url: true, authHeader: true },
  });
}
