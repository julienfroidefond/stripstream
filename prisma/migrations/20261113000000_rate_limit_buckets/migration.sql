-- Compteur de quota partagé entre instances et redémarrages.
-- Ajout d'une table uniquement : aucune reconstruction de table existante.
CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL,
    "windowStart" BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS "rate_limit_buckets_windowStart_idx" ON "rate_limit_buckets"("windowStart");
