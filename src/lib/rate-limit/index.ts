import logger from "@/lib/logger";
import {
  toRateLimitResult,
  type RateLimitOptions,
  type RateLimitResult,
} from "./fixed-window";
import { createMemoryRateLimitStore, type RateLimitStore } from "./store";

export type { RateLimitOptions, RateLimitResult } from "./fixed-window";
export type { RateLimitStore } from "./store";
export { createMemoryRateLimitStore } from "./store";

export type RateLimiter = (
  key: string,
  options: RateLimitOptions
) => Promise<RateLimitResult>;

/** Applique la décision d'un store : une seule horloge pour le hit et le résultat. */
export function createRateLimiter(store: RateLimitStore): RateLimiter {
  return async (key, options) => {
    const now = Date.now();
    const window = await store.hit(key, now, options.windowMs);
    return toRateLimitResult(window, now, options);
  };
}

const memoryLimiter = createRateLimiter(createMemoryRateLimitStore());

/** `memory` force le store local au process ; `NODE_ENV=test` l'impose aux tests. */
function usesMemoryStore(): boolean {
  return (
    process.env.RATE_LIMIT_STORE === "memory" ||
    process.env.NODE_ENV === "test"
  );
}

let durableLimiter: Promise<RateLimiter> | null = null;

async function loadDurableLimiter(): Promise<RateLimiter> {
  const [{ createPrismaRateLimitStore }, { default: prisma }] =
    await Promise.all([import("./prisma-store"), import("@/lib/prisma")]);

  return createRateLimiter(createPrismaRateLimitStore(prisma));
}

async function resolveLimiter(): Promise<RateLimiter> {
  durableLimiter ??= loadDurableLimiter();

  try {
    return await durableLimiter;
  } catch (error) {
    // Ne pas figer un chargement raté : la prochaine tentative recréera la
    // promesse, sinon chaque appel paierait un rejet mémorisé.
    durableLimiter = null;
    throw error;
  }
}

/**
 * Consomme un appel pour `key`.
 *
 * Le compteur partagé (SQLite) survit aux redémarrages et reste vrai si
 * plusieurs instances servent l'app. Si ce store échoue, on retombe sur le
 * store mémoire local plutôt que de laisser passer un appel sans aucune
 * limite : le quota redevient simplement local au process, avec un log.
 */
export async function checkRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  if (usesMemoryStore()) return memoryLimiter(key, options);

  try {
    const limiter = await resolveLimiter();
    return await limiter(key, options);
  } catch (error) {
    logger.warn(
      { err: error },
      "Rate-limit store unavailable, falling back to the in-memory limiter"
    );
    return memoryLimiter(key, options);
  }
}
