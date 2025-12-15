-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "schedule" TEXT NOT NULL DEFAULT 'DAILY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastCheckedAt" DATETIME,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "SavedSearch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SearchRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "query" TEXT NOT NULL,
    "filters" JSONB,
    "sources" JSONB,
    "stats" JSONB,
    "error" TEXT,
    "savedSearchId" TEXT,
    CONSTRAINT "SearchRun_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Work" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "abstract" TEXT,
    "year" INTEGER,
    "venue" TEXT,
    "url" TEXT,
    "doi" TEXT,
    "arxivId" TEXT,
    "openalexId" TEXT,
    "normalizedTitle" TEXT NOT NULL,
    "authors" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "url" TEXT,
    "raw" JSONB,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workId" TEXT NOT NULL,
    CONSTRAINT "WorkSource_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedSearchWork" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "savedSearchId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    CONSTRAINT "SavedSearchWork_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SavedSearchWork_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "SavedSearch_projectId_idx" ON "SavedSearch"("projectId");

-- CreateIndex
CREATE INDEX "SavedSearch_active_schedule_lastCheckedAt_idx" ON "SavedSearch"("active", "schedule", "lastCheckedAt");

-- CreateIndex
CREATE INDEX "SearchRun_savedSearchId_runAt_idx" ON "SearchRun"("savedSearchId", "runAt");

-- CreateIndex
CREATE UNIQUE INDEX "Work_doi_key" ON "Work"("doi");

-- CreateIndex
CREATE UNIQUE INDEX "Work_arxivId_key" ON "Work"("arxivId");

-- CreateIndex
CREATE UNIQUE INDEX "Work_openalexId_key" ON "Work"("openalexId");

-- CreateIndex
CREATE INDEX "Work_year_idx" ON "Work"("year");

-- CreateIndex
CREATE INDEX "Work_normalizedTitle_idx" ON "Work"("normalizedTitle");

-- CreateIndex
CREATE INDEX "WorkSource_workId_idx" ON "WorkSource"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkSource_source_sourceId_key" ON "WorkSource"("source", "sourceId");

-- CreateIndex
CREATE INDEX "SavedSearchWork_savedSearchId_firstSeenAt_idx" ON "SavedSearchWork"("savedSearchId", "firstSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedSearchWork_savedSearchId_workId_key" ON "SavedSearchWork"("savedSearchId", "workId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
