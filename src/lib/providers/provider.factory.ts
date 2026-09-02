import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { getActiveConnection } from "@/lib/active-connection";
import { getResolvedStripstreamConfig } from "./stripstream/stripstream-config-resolver";
import type { IMediaProvider } from "./provider.interface";
import type { StripstreamReadingListDetail } from "@/types/stripstream";

export async function getProvider(): Promise<IMediaProvider | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const userId = parseInt(user.id, 10);

  const activeConnection = await getActiveConnection(userId);
  const activeProvider = activeConnection.provider;

  if (activeProvider === "stripstream") {
    const resolved = await getResolvedStripstreamConfig(
      userId,
      activeConnection.configId ?? undefined
    );
    if (resolved) {
      const { StripstreamProvider } = await import("./stripstream/stripstream.provider");
      return new StripstreamProvider(resolved.url, resolved.token);
    }
  }

  if (activeProvider === "komga") {
    const config = await resolveActiveKomgaConfig(userId, activeConnection.configId);
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
  return (await getActiveConnection(userId)).provider;
}

/**
 * Fetches the detail of a reading list (Stripstream-only feature).
 * Returns null if the active provider is not Stripstream or the user is not authenticated.
 */
export async function fetchReadingListDetail(id: string): Promise<StripstreamReadingListDetail | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const userId = parseInt(user.id, 10);
  const activeConnection = await getActiveConnection(userId);
  if (activeConnection.provider !== "stripstream") return null;

  const resolved = await getResolvedStripstreamConfig(
    userId,
    activeConnection.configId ?? undefined
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
