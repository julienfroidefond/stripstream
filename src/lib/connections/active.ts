import { cookies } from "next/headers";
import { cache } from "react";
import type { ProviderType } from "@/lib/providers/types";
import { isConnectionProvider } from "./descriptors";
import { getProviderDefinition, providerDefinitions } from "./registry";

const ACTIVE_PROVIDER_COOKIE = "stripstream-active-provider";

/**
 * Cookie de la config sélectionnée pour un provider
 * (`stripstream-active-komga-config`, `stripstream-active-stripstream-config`).
 */
function activeConfigCookie(provider: ProviderType): string {
  return `stripstream-active-${provider}-config`;
}

export interface ActiveConnection {
  provider: ProviderType;
  configId: number | null;
}

function parseConfigId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Resolves the connection selected by this browser. The database remains the
 * source of connection details, but not of the active selection. Without a
 * valid selection, the first config of the first provider (registry order)
 * wins.
 */
export const getActiveConnection = cache(async (userId: number): Promise<ActiveConnection> => {
  const cookieStore = await cookies();
  const provider = cookieStore.get(ACTIVE_PROVIDER_COOKIE)?.value;

  if (isConnectionProvider(provider)) {
    const configId = parseConfigId(cookieStore.get(activeConfigCookie(provider))?.value);
    const config = configId
      ? await getProviderDefinition(provider).store.findLabel(userId, configId)
      : null;
    if (config) return { provider, configId: config.id };
  }

  const definitions = providerDefinitions();
  const firstConfigs = await Promise.all(
    definitions.map((definition) => definition.store.findFirst(userId))
  );
  for (const [index, config] of firstConfigs.entries()) {
    if (config) return { provider: definitions[index].provider, configId: config.id };
  }
  return { provider: definitions[0].provider, configId: null };
});

export async function setActiveConnection(
  provider: ProviderType,
  configId: number
): Promise<void> {
  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  };

  cookieStore.set(ACTIVE_PROVIDER_COOKIE, provider, options);
  cookieStore.set(activeConfigCookie(provider), String(configId), options);
}
