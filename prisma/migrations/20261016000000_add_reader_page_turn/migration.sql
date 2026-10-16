-- AlterTable: persist the reader page-turn animation preference per user.
ALTER TABLE "preferences" ADD COLUMN "readerPageTurn" BOOLEAN NOT NULL DEFAULT true;
