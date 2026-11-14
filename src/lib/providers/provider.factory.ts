import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { createProviderFor } from "@/lib/connections/registry";
import { resolveActiveConnection } from "@/lib/connections/resolve";
import type { ResolvedConnection } from "@/lib/connections/types";
import type { IMediaProvider } from "./provider.interface";

/**
 * Seul point de construction des providers. Les actions, les probes et les
 * routes passent une connexion déjà résolue / déchiffrée par `@/lib/connections` ;
 * la classe à instancier vient de la définition du provider (ADR 0030).
 */
export function createProvider(connection: ResolvedConnection): Promise<IMediaProvider> {
  return createProviderFor(connection);
}

export const getProvider = cache(async (): Promise<IMediaProvider | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const connection = await resolveActiveConnection(parseInt(user.id, 10));
  return connection ? createProvider(connection) : null;
});
