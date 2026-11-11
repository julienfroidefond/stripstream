import { checkRateLimit } from "@/utils/rate-limit";
import { createProvider } from "@/lib/providers/provider.factory";
import type { ProviderType } from "@/lib/providers/types";
import { getStoredConnection } from "./resolve";
import type {
  ConnectionTestRateLimit,
  ConnectionTestResult,
  ResolvedConnection,
} from "./types";

export const CONNECTION_TEST_RATE_LIMIT = {
  limit: 5,
  windowMs: 30_000,
} as const;

/** Clé du budget partagé par les deux providers et les actions de config. */
export function connectionTestRateLimitKey(provider: ProviderType, userId: number): string {
  return `test-${provider}:${userId}`;
}

/**
 * Budget partagé par les deux providers : la clé inclut le provider pour que
 * tester Komga ne consomme pas les essais Stripstream (et inversement).
 */
export function checkConnectionTestRateLimit(
  provider: ProviderType,
  userId: number
): ConnectionTestRateLimit {
  const result = checkRateLimit(connectionTestRateLimitKey(provider, userId), {
    limit: CONNECTION_TEST_RATE_LIMIT.limit,
    windowMs: CONNECTION_TEST_RATE_LIMIT.windowMs,
  });

  return {
    allowed: result.allowed,
    retryAfterSeconds: Math.ceil(result.resetMs / 1000),
  };
}

/**
 * Teste une connexion résolue via la factory : le probe ne reconstruit jamais
 * un provider à la main et ne refait pas un fetch Basic/Bearer parallèle.
 */
export async function testConnection(
  connection: ResolvedConnection
): Promise<ConnectionTestResult> {
  const provider = await createProvider(connection);
  return provider.testConnection();
}

/**
 * Teste une config enregistrée précise. `null` signifie « config introuvable »,
 * pas « test échoué » : les actions peuvent ainsi garder leurs messages.
 */
export async function testStoredConnection(
  provider: ProviderType,
  id: number,
  userId: number
): Promise<ConnectionTestResult | null> {
  const connection =
    provider === "komga"
      ? await getStoredConnection("komga", id, userId)
      : await getStoredConnection("stripstream", id, userId);

  if (!connection) return null;
  return testConnection(connection);
}
