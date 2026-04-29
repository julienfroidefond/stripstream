-- Multi-config migration: support multiple Komga and Stripstream configs per user.
-- Strategy: rebuild affected tables (SQLite) while preserving data.
-- Existing single configs are renamed "Default" and become the active config.
-- Existing favorites are linked to that user's existing config of the same type.

PRAGMA foreign_keys=OFF;

-- 1) komgaconfigs: drop @unique(userId), add `name`, add @unique(userId, name) -------------
CREATE TABLE "new_komgaconfigs" (
    "id"         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId"     INTEGER NOT NULL,
    "name"       TEXT    NOT NULL,
    "url"        TEXT    NOT NULL,
    "username"   TEXT    NOT NULL,
    "authHeader" TEXT    NOT NULL,
    "createdAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  DATETIME NOT NULL,
    CONSTRAINT "komgaconfigs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_komgaconfigs" ("id", "userId", "name", "url", "username", "authHeader", "createdAt", "updatedAt")
SELECT "id", "userId", 'Default', "url", "username", "authHeader", "createdAt", "updatedAt"
FROM "komgaconfigs";

DROP TABLE "komgaconfigs";
ALTER TABLE "new_komgaconfigs" RENAME TO "komgaconfigs";

CREATE INDEX        "komgaconfigs_userId_idx"        ON "komgaconfigs"("userId");
CREATE UNIQUE INDEX "komgaconfigs_userId_name_key"   ON "komgaconfigs"("userId", "name");

-- 2) stripstreamconfigs: same shape change ------------------------------------------------
CREATE TABLE "new_stripstreamconfigs" (
    "id"        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId"    INTEGER NOT NULL,
    "name"      TEXT    NOT NULL,
    "url"       TEXT    NOT NULL,
    "token"     TEXT    NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "stripstreamconfigs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_stripstreamconfigs" ("id", "userId", "name", "url", "token", "createdAt", "updatedAt")
SELECT "id", "userId", 'Default', "url", "token", "createdAt", "updatedAt"
FROM "stripstreamconfigs";

DROP TABLE "stripstreamconfigs";
ALTER TABLE "new_stripstreamconfigs" RENAME TO "stripstreamconfigs";

CREATE INDEX        "stripstreamconfigs_userId_idx"      ON "stripstreamconfigs"("userId");
CREATE UNIQUE INDEX "stripstreamconfigs_userId_name_key" ON "stripstreamconfigs"("userId", "name");

-- 3) users: add active config FKs and seed them with the existing single config ----------
ALTER TABLE "users" ADD COLUMN "activeKomgaConfigId"       INTEGER;
ALTER TABLE "users" ADD COLUMN "activeStripstreamConfigId" INTEGER;

UPDATE "users"
SET    "activeKomgaConfigId" = (
    SELECT "id" FROM "komgaconfigs" WHERE "komgaconfigs"."userId" = "users"."id" LIMIT 1
);

UPDATE "users"
SET    "activeStripstreamConfigId" = (
    SELECT "id" FROM "stripstreamconfigs" WHERE "stripstreamconfigs"."userId" = "users"."id" LIMIT 1
);

-- 4) favorites: add komgaConfigId / stripstreamConfigId, replace unique index ------------
CREATE TABLE "new_favorites" (
    "id"                  INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId"              INTEGER NOT NULL,
    "seriesId"            TEXT    NOT NULL,
    "provider"            TEXT    NOT NULL DEFAULT 'komga',
    "komgaConfigId"       INTEGER,
    "stripstreamConfigId" INTEGER,
    "createdAt"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           DATETIME NOT NULL,
    CONSTRAINT "favorites_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "favorites_komgaConfigId_fkey"
        FOREIGN KEY ("komgaConfigId") REFERENCES "komgaconfigs" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "favorites_stripstreamConfigId_fkey"
        FOREIGN KEY ("stripstreamConfigId") REFERENCES "stripstreamconfigs" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_favorites" ("id", "userId", "seriesId", "provider", "komgaConfigId", "stripstreamConfigId", "createdAt", "updatedAt")
SELECT
    f."id",
    f."userId",
    f."seriesId",
    f."provider",
    CASE
        WHEN f."provider" = 'komga' THEN
            (SELECT "id" FROM "komgaconfigs" WHERE "komgaconfigs"."userId" = f."userId" LIMIT 1)
        ELSE NULL
    END,
    CASE
        WHEN f."provider" = 'stripstream' THEN
            (SELECT "id" FROM "stripstreamconfigs" WHERE "stripstreamconfigs"."userId" = f."userId" LIMIT 1)
        ELSE NULL
    END,
    f."createdAt",
    f."updatedAt"
FROM "favorites" f;

DROP TABLE "favorites";
ALTER TABLE "new_favorites" RENAME TO "favorites";

CREATE INDEX        "favorites_userId_idx"                              ON "favorites"("userId");
CREATE UNIQUE INDEX "favorites_userId_komgaConfigId_seriesId_key"       ON "favorites"("userId", "komgaConfigId", "seriesId");
CREATE UNIQUE INDEX "favorites_userId_stripstreamConfigId_seriesId_key" ON "favorites"("userId", "stripstreamConfigId", "seriesId");

PRAGMA foreign_keys=ON;
