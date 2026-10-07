-- AlterTable: add reader and display preferences
ALTER TABLE "preferences" ADD COLUMN "readingDirection" TEXT NOT NULL DEFAULT 'ltr';
ALTER TABLE "preferences" ADD COLUMN "readerFitMode" TEXT NOT NULL DEFAULT 'fit';
ALTER TABLE "preferences" ADD COLUMN "readerDoublePageMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "preferences" ADD COLUMN "defaultSortOrder" TEXT NOT NULL DEFAULT 'title';
ALTER TABLE "preferences" ADD COLUMN "showMissingBooks" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "preferences" ADD COLUMN "hideMissingBooks" BOOLEAN NOT NULL DEFAULT false;
