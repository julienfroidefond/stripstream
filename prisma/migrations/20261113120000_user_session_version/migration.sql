-- AlterTable: session version per user. Bumped on every password change or
-- reset so that JWTs issued before it are rejected (ADR 0032). Additive only;
-- existing rows default to 0, which matches tokens issued before this column.
ALTER TABLE "users" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
