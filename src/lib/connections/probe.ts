import { checkRateLimit } from "@/lib/rate-limit";
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

/** Clé du budget de test d'un provider pour un user (actions et probe la partagent). */
export function connectionTestRateLimitKey(provider: ProviderType, userId: number): string {
  return `test-${provider}:${userId}`;
}

/**
 * Un budget par provider : la clé inclut le provider pour que tester Komga ne
 * consomme pas les essais Stripstream (et inversement).
 */
export async function checkConnectionTestRateLimit(
  provider: ProviderType,
  userId: number
): Promise<ConnectionTestRateLimit> {
  const result = await checkRateLimit(connectionTestRateLimitKey(provider, userId), {
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
 * un provider à la main et ne refait pas un fetch Basic/Bearer parallèle. La
 * sonde elle-même est `IMediaProvider.testConnection`, propre à chaque provider.
 */
export async function testConnection(
  connection: ResolvedConnection
): Promise<ConnectionTestResult> {
  const provider = await createProvider(connection);
  return provider.testConnection();
}

/**
 * Teste une config enregistrée précise. `null` signifie « config introuvable »,
 * pas « test échoué » : les actions peuvent ainsi garder leurs codes.
 */
export async function testStoredConnection(
  provider: ProviderType,
  id: number,
  userId: number
): Promise<ConnectionTestResult | null> {
  const connection = await getStoredConnection(provider, id, userId);
  if (!connection) return null;
  return testConnection(connection);
}
