import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
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
      stripstreamConfig: { select: { url: true, token: true } },
    },
  });

  if (!dbUser) return null;

  const activeProvider = dbUser.activeProvider ?? "komga";

  if (activeProvider === "stripstream" && dbUser.stripstreamConfig) {
    const { StripstreamProvider } = await import("./stripstream/stripstream.provider");
    return new StripstreamProvider(
      dbUser.stripstreamConfig.url,
      dbUser.stripstreamConfig.token
    );
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
