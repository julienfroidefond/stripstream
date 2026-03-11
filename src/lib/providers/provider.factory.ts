import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { getResolvedStripstreamConfig } from "./stripstream/stripstream-config-resolver";
import type { IMediaProvider } from "./provider.interface";

export async function getProvider(): Promise<IMediaProvider | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const userId = parseInt(user.id, 10);

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      activeProvider: true,
      config: { select: { url: true, authHeader: true } },
      stripstreamConfig: { select: { id: true } },
    },
  });

  if (!dbUser) return null;

  const activeProvider = dbUser.activeProvider ?? "komga";

  if (activeProvider === "stripstream") {
    const resolved = await getResolvedStripstreamConfig(userId);
    if (resolved) {
      const { StripstreamProvider } = await import("./stripstream/stripstream.provider");
      return new StripstreamProvider(resolved.url, resolved.token);
    }
  }

  if (activeProvider === "komga" || !dbUser.activeProvider) {
    if (!dbUser.config) return null;
    const { KomgaProvider } = await import("./komga/komga.provider");
    return new KomgaProvider(dbUser.config.url, dbUser.config.authHeader);
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
