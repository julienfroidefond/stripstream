import type { PrismaClient } from "@/generated/prisma/client";
import logger from "@/lib/logger";
import { activeWindow, type FixedWindow } from "./fixed-window";
import type { RateLimitStore } from "./store";

/** Fréquence du balayage des fenêtres périmées (une heure). */
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Durée de conservation : les fenêtres de l'app durent au plus 60 s, donc une
 * heure de marge garantit qu'aucune ligne encore active n'est supprimée.
 */
const PRUNE_RETENTION_MS = 60 * 60 * 1000;

interface RateLimitRow {
  count: number;
  windowStart: bigint;
}

export interface PrismaRateLimitStoreOptions {
  /** Cadence du balayage ; `0` balaie à chaque appel (tests). */
  pruneIntervalMs?: number;
  /** Âge au-delà duquel une fenêtre est supprimée. */
  pruneRetentionMs?: number;
}

/**
 * Store partagé, adossé à SQLite (`rate_limit_buckets`).
 *
 * L'upsert est une seule instruction atomique : SQLite sérialise les écritures,
 * donc deux tentatives concurrentes ne peuvent pas lire le même compteur avant
 * de l'incrémenter. Les règles de fenêtre reprennent exactement
 * `advanceWindow` (`fixed-window.ts`) : ouverture d'une nouvelle fenêtre, puis
 * incrément du compteur à chaque appel.
 */
export function createPrismaRateLimitStore(
  prisma: PrismaClient,
  {
    pruneIntervalMs = PRUNE_INTERVAL_MS,
    pruneRetentionMs = PRUNE_RETENTION_MS,
  }: PrismaRateLimitStoreOptions = {}
): RateLimitStore {
  let lastPruneAt = Number.NEGATIVE_INFINITY;

  async function prune(now: number): Promise<void> {
    if (now - lastPruneAt < pruneIntervalMs) return;
    lastPruneAt = now;

    try {
      await prisma.$executeRaw`
        DELETE FROM "rate_limit_buckets"
        WHERE "windowStart" < ${now - pruneRetentionMs}
      `;
    } catch (error) {
      // Le balayage est un entretien : son échec ne doit pas refuser un appel
      // légitime. La prochaine échéance réessaiera.
      logger.warn({ err: error }, "Rate-limit bucket sweep failed");
    }
  }

  return {
    async hit(key: string, now: number, windowMs: number): Promise<FixedWindow> {
      const rows = await prisma.$queryRaw<RateLimitRow[]>`
        INSERT INTO "rate_limit_buckets" ("key", "count", "windowStart")
        VALUES (${key}, 1, ${now})
        ON CONFLICT("key") DO UPDATE SET
          "count" = CASE
            WHEN excluded."windowStart" - "rate_limit_buckets"."windowStart" >= ${windowMs} THEN 1
            ELSE "rate_limit_buckets"."count" + 1
          END,
          "windowStart" = CASE
            WHEN excluded."windowStart" - "rate_limit_buckets"."windowStart" >= ${windowMs} THEN excluded."windowStart"
            ELSE "rate_limit_buckets"."windowStart"
          END
        RETURNING "count", "windowStart"
      `;

      const row = rows[0];
      if (!row) throw new Error("rate-limit upsert returned no row");

      await prune(now);

      return { count: Number(row.count), windowStart: Number(row.windowStart) };
    },

    async peek(key: string, now: number, windowMs: number): Promise<FixedWindow | null> {
      const rows = await prisma.$queryRaw<RateLimitRow[]>`
        SELECT "count", "windowStart" FROM "rate_limit_buckets" WHERE "key" = ${key}
      `;
      const row = rows[0];
      if (!row) return null;
      return activeWindow(
        { count: Number(row.count), windowStart: Number(row.windowStart) },
        now,
        windowMs
      );
    },
  };
}
