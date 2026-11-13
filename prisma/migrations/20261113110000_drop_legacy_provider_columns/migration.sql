-- Drop the dead provider-selection and reader-fit columns.
--
-- `users.activeProvider` / `activeKomgaConfigId` / `activeStripstreamConfigId`
-- were replaced by the per-browser `stripstream-active-provider*` cookies in
-- 20260429000000; no app code has read them since.
-- `preferences.readerFitMode` became dead when the reader started always
-- fitting the page. Keeping either keeps a false API surface and forces every
-- schema reader to learn the legacy note.
--
-- SQLite cannot drop a column without rebuilding the table here, so both
-- tables are copied into their new shape and swapped. Rebuild-don't-ALTER, with
-- foreign keys disabled so dropping `users` cannot cascade into the child
-- tables (`komgaconfigs`, `stripstreamconfigs`, `preferences`, `favorites`).
-- See ADR 0020.

PRAGMA foreign_keys=OFF;

-- 1) preferences: drop readerFitMode ---------------------------------------
CREATE TABLE "new_preferences" (
    "id"                   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId"               INTEGER NOT NULL,
    "showThumbnails"       BOOLEAN NOT NULL DEFAULT true,
    "showOnlyUnread"       BOOLEAN NOT NULL DEFAULT false,
    "displayMode"          JSONB   NOT NULL,
    "background"           JSONB   NOT NULL,
    "readerPrefetchCount"  INTEGER NOT NULL DEFAULT 5,
    "anonymousMode"        BOOLEAN NOT NULL DEFAULT false,
    "readingDirection"     TEXT    NOT NULL DEFAULT 'ltr',
    "readerBackground"     TEXT    NOT NULL DEFAULT 'default',
    "readerDoublePageMode" BOOLEAN NOT NULL DEFAULT false,
    "readerPageTurn"       BOOLEAN NOT NULL DEFAULT true,
    "defaultSortOrder"     TEXT    NOT NULL DEFAULT 'title',
    "showMissingBooks"     BOOLEAN NOT NULL DEFAULT true,
    "hideMissingBooks"     BOOLEAN NOT NULL DEFAULT false,
    "createdAt"            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            DATETIME NOT NULL,
    CONSTRAINT "preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_preferences" (
    "id", "userId", "showThumbnails", "showOnlyUnread", "displayMode", "background",
    "readerPrefetchCount", "anonymousMode", "readingDirection", "readerBackground",
    "readerDoublePageMode", "readerPageTurn", "defaultSortOrder", "showMissingBooks",
    "hideMissingBooks", "createdAt", "updatedAt"
)
SELECT
    "id", "userId", "showThumbnails", "showOnlyUnread", "displayMode", "background",
    "readerPrefetchCount", "anonymousMode", "readingDirection", "readerBackground",
    "readerDoublePageMode", "readerPageTurn", "defaultSortOrder", "showMissingBooks",
    "hideMissingBooks", "createdAt", "updatedAt"
FROM "preferences";

DROP TABLE "preferences";
ALTER TABLE "new_preferences" RENAME TO "preferences";

CREATE UNIQUE INDEX "preferences_userId_key" ON "preferences"("userId");

-- 2) users: drop activeProvider / activeKomgaConfigId / activeStripstreamConfigId --
CREATE TABLE "new_users" (
    "id"            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email"         TEXT    NOT NULL,
    "password"      TEXT    NOT NULL,
    "roles"         JSONB   NOT NULL DEFAULT ["ROLE_USER"],
    "authenticated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     DATETIME NOT NULL
);

INSERT INTO "new_users" ("id", "email", "password", "roles", "authenticated", "createdAt", "updatedAt")
SELECT "id", "email", "password", "roles", "authenticated", "createdAt", "updatedAt"
FROM "users";

DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
