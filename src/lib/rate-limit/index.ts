import logger from "@/lib/logger";
import {
  toPeekResult,
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
export function createRateLimiter(store: Pick<RateLimitStore, "hit">): RateLimiter {
  return async (key, options) => {
    const now = Date.now();
    const window = await store.hit(key, now, options.windowMs);
    return toRateLimitResult(window, now, options);
  };
}

/** Décision du prochain appel pour `key`, sans le consommer. */
export function createRateLimitPeeker(store: Pick<RateLimitStore, "peek">): RateLimiter {
  return async (key, options) => {
    const now = Date.now();
    const window = await store.peek(key, now, options.windowMs);
    return toPeekResult(window, now, options);
  };
}

const memoryStore = createMemoryRateLimitStore();
const memoryLimiter = createRateLimiter(memoryStore);
const memoryPeeker = createRateLimitPeeker(memoryStore);

/** `memory` force le store local au process ; `NODE_ENV=test` l'impose aux tests. */
function usesMemoryStore(): boolean {
  return (
    process.env.RATE_LIMIT_STORE === "memory" ||
    process.env.NODE_ENV === "test"
  );
}

let durableStore: Promise<RateLimitStore> | null = null;

async function loadDurableStore(): Promise<RateLimitStore> {
  const [{ createPrismaRateLimitStore }, { default: prisma }] =
    await Promise.all([import("./prisma-store"), import("@/lib/prisma")]);

  return createPrismaRateLimitStore(prisma);
}

async function resolveStore(): Promise<RateLimitStore> {
  durableStore ??= loadDurableStore();

  try {
    return await durableStore;
  } catch (error) {
    // Ne pas figer un chargement raté : la prochaine tentative recréera la
    // promesse, sinon chaque appel paierait un rejet mémorisé.
    durableStore = null;
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
    return await createRateLimiter(await resolveStore())(key, options);
  } catch (error) {
    logger.warn(
      { err: error },
      "Rate-limit store unavailable, falling back to the in-memory limiter"
    );
    return memoryLimiter(key, options);
  }
}

/**
 * Indique si le prochain appel pour `key` serait autorisé, sans le compter.
 * Pour un budget qui ne compte que certains appels (les échecs de mot de
 * passe) : on vérifie avant de traiter, et `checkRateLimit` n'est appelé
 * qu'après un échec. Même repli mémoire que `checkRateLimit`.
 */
export async function peekRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  if (usesMemoryStore()) return memoryPeeker(key, options);

  try {
    return await createRateLimitPeeker(await resolveStore())(key, options);
  } catch (error) {
    logger.warn(
      { err: error },
      "Rate-limit store unavailable, falling back to the in-memory limiter"
    );
    return memoryPeeker(key, options);
  }
}
