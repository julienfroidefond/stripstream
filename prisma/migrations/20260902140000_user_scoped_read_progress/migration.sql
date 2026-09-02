CREATE TABLE "readprogresses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "bookId" TEXT NOT NULL,
    "page" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "lastReadAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "readprogresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "readprogresses_userId_bookId_key" ON "readprogresses"("userId", "bookId");
CREATE INDEX "readprogresses_userId_idx" ON "readprogresses"("userId");
