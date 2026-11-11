import { cache } from "react";
import { getCurrentUser } from "@/lib/auth-utils";
import { getActiveConnection } from "@/lib/connections/active";
import { resolveActiveConnection } from "@/lib/connections/resolve";
import type {
  ResolvedConnection,
  StripstreamConnection,
} from "@/lib/connections/types";
import type { IMediaProvider } from "./provider.interface";
import type { ProviderType } from "./types";

/**
 * Seul point de construction des providers. Les actions, les probes et les
 * routes passent une connexion déjà résolue / déchiffrée par `@/lib/connections`.
 */
export async function createProvider(connection: ResolvedConnection): Promise<IMediaProvider> {
  if (connection.provider === "stripstream") {
    return createStripstreamProvider(connection);
  }

  const { KomgaProvider } = await import("./komga/komga.provider");
  return new KomgaProvider(connection.url, connection.authHeader);
}

async function createStripstreamProvider(connection: StripstreamConnection) {
  const { StripstreamProvider } = await import("./stripstream/stripstream.provider");
  return new StripstreamProvider(connection.url, connection.token);
}

export const getProvider = cache(async (): Promise<IMediaProvider | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const connection = await resolveActiveConnection(parseInt(user.id, 10));
  return connection ? createProvider(connection) : null;
});

export const getActiveProviderType = cache(async (): Promise<ProviderType | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const userId = parseInt(user.id, 10);
  return (await getActiveConnection(userId)).provider;
});
