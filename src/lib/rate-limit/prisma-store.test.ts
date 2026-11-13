import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaRateLimitStore } from "./prisma-store";

/**
 * Test d'intégration du store partagé : la même instruction SQL que la prod
 * (upsert atomique + `RETURNING`) tourne contre une base SQLite en mémoire,
 * donc les règles de fenêtre sont vérifiées par le moteur, pas par un mock.
 */
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: "file::memory:" }),
});

const WINDOW_MS = 1000;

beforeAll(async () => {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "count" INTEGER NOT NULL,
      "windowStart" BIGINT NOT NULL
    )
  `;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("createPrismaRateLimitStore", () => {
  it("opens a window on the first call", async () => {
    const store = createPrismaRateLimitStore(prisma, { pruneIntervalMs: 0 });

    await expect(store.hit("first", 1000, WINDOW_MS)).resolves.toEqual({
      count: 1,
      windowStart: 1000,
    });
  });

  it("increments on every call and keeps the window start", async () => {
    const store = createPrismaRateLimitStore(prisma, { pruneIntervalMs: 0 });

    await store.hit("counted", 1000, WINDOW_MS);
    await store.hit("counted", 1100, WINDOW_MS);
    expect(await store.hit("counted", 1200, WINDOW_MS)).toEqual({
      count: 3,
      windowStart: 1000,
    });

    // Les appels refusés restent comptés pour que la décision soit calculable
    // depuis la seule fenêtre.
    expect(await store.hit("counted", 1300, WINDOW_MS)).toEqual({
      count: 4,
      windowStart: 1000,
    });
  });

  it("refills once the window elapses", async () => {
    const store = createPrismaRateLimitStore(prisma, { pruneIntervalMs: 0 });

    await store.hit("refill", 1000, WINDOW_MS);
    await store.hit("refill", 1100, WINDOW_MS);
    await store.hit("refill", 1200, WINDOW_MS);

    expect(await store.hit("refill", 2000, WINDOW_MS)).toEqual({
      count: 1,
      windowStart: 2000,
    });
  });

  it("keeps one row per key", async () => {
    const store = createPrismaRateLimitStore(prisma, { pruneIntervalMs: 0 });

    await store.hit("row", 1000, WINDOW_MS);
    await store.hit("row", 1100, WINDOW_MS);

    const rows = await prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) AS "total" FROM "rate_limit_buckets" WHERE "key" = 'row'
    `;

    expect(Number(rows[0].total)).toBe(1);
  });

  it("sweeps windows older than the retention on the next hit", async () => {
    const store = createPrismaRateLimitStore(prisma, {
      pruneIntervalMs: 0,
      pruneRetentionMs: 1000,
    });

    await store.hit("stale", 1000, WINDOW_MS);
    await store.hit("fresh", 5000, WINDOW_MS);

    const rows = await prisma.$queryRaw<{ key: string }[]>`
      SELECT "key" FROM "rate_limit_buckets" WHERE "key" IN ('stale', 'fresh')
    `;

    expect(rows.map((row) => row.key)).toEqual(["fresh"]);
  });
});
