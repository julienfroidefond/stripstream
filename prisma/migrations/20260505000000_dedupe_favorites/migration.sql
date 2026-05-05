-- Dedupe favorites and align them with the user's active config.
--
-- Problem: after the multi-config migration (20260429000000), favorites can be
--   - orphans (both komgaConfigId and stripstreamConfigId NULL) ;
--   - tied to a config that's no longer the user's active config, possibly
--     producing duplicates across configs for the same (userId, seriesId).
--
-- This migration:
--   1) deletes truly orphan favorites,
--   2) per provider type and per (userId, seriesId), keeps a single row -
--      preferring the one tied to the active config, otherwise the most recent
--      and remaps the survivor to the active config (when one exists).
--
-- Cross-provider duplicates (same series favorited under both komga and
-- stripstream) are preserved on purpose - that's a legitimate scenario.
--
-- The migration is idempotent: re-running on cleaned data is a no-op.

PRAGMA foreign_keys=OFF;

-- 1) Drop favorites with no provider link at all.
DELETE FROM "favorites"
WHERE "komgaConfigId" IS NULL AND "stripstreamConfigId" IS NULL;

-- 2a) Komga: dedupe per (userId, seriesId), preferring active config / most recent.
DELETE FROM "favorites"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT
      f."id",
      ROW_NUMBER() OVER (
        PARTITION BY f."userId", f."seriesId"
        ORDER BY
          CASE WHEN f."komgaConfigId" = u."activeKomgaConfigId" THEN 0 ELSE 1 END,
          f."createdAt" DESC,
          f."id" DESC
      ) AS rn
    FROM "favorites" f
    JOIN "users" u ON u."id" = f."userId"
    WHERE f."komgaConfigId" IS NOT NULL
  )
  WHERE rn > 1
);

-- 2b) Komga: remap survivors to the user's active config (when set and different).
UPDATE "favorites"
SET "komgaConfigId" = (
  SELECT u."activeKomgaConfigId" FROM "users" u WHERE u."id" = "favorites"."userId"
)
WHERE "komgaConfigId" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "users" u
    WHERE u."id" = "favorites"."userId"
      AND u."activeKomgaConfigId" IS NOT NULL
      AND u."activeKomgaConfigId" != "favorites"."komgaConfigId"
  );

-- 3a) Stripstream: same dedupe pass.
DELETE FROM "favorites"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT
      f."id",
      ROW_NUMBER() OVER (
        PARTITION BY f."userId", f."seriesId"
        ORDER BY
          CASE WHEN f."stripstreamConfigId" = u."activeStripstreamConfigId" THEN 0 ELSE 1 END,
          f."createdAt" DESC,
          f."id" DESC
      ) AS rn
    FROM "favorites" f
    JOIN "users" u ON u."id" = f."userId"
    WHERE f."stripstreamConfigId" IS NOT NULL
  )
  WHERE rn > 1
);

-- 3b) Stripstream: remap survivors to the active config.
UPDATE "favorites"
SET "stripstreamConfigId" = (
  SELECT u."activeStripstreamConfigId" FROM "users" u WHERE u."id" = "favorites"."userId"
)
WHERE "stripstreamConfigId" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "users" u
    WHERE u."id" = "favorites"."userId"
      AND u."activeStripstreamConfigId" IS NOT NULL
      AND u."activeStripstreamConfigId" != "favorites"."stripstreamConfigId"
  );

PRAGMA foreign_keys=ON;
