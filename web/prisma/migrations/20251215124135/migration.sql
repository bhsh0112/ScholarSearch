-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SavedSearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "schedule" TEXT NOT NULL DEFAULT 'DAILY',
    "pushStrategy" TEXT NOT NULL DEFAULT 'HYBRID',
    "pushTopN" INTEGER NOT NULL DEFAULT 10,
    "noiseLevel" TEXT NOT NULL DEFAULT 'STANDARD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastCheckedAt" DATETIME,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "SavedSearch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SavedSearch" ("active", "createdAt", "filters", "id", "lastCheckedAt", "name", "projectId", "query", "schedule", "updatedAt") SELECT "active", "createdAt", "filters", "id", "lastCheckedAt", "name", "projectId", "query", "schedule", "updatedAt" FROM "SavedSearch";
DROP TABLE "SavedSearch";
ALTER TABLE "new_SavedSearch" RENAME TO "SavedSearch";
CREATE INDEX "SavedSearch_projectId_idx" ON "SavedSearch"("projectId");
CREATE INDEX "SavedSearch_active_schedule_lastCheckedAt_idx" ON "SavedSearch"("active", "schedule", "lastCheckedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
