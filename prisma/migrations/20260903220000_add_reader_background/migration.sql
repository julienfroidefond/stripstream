-- AlterTable: persist the reader background preference per user.
ALTER TABLE "preferences" ADD COLUMN "readerBackground" TEXT NOT NULL DEFAULT 'default';
