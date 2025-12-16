-- CreateTable
CREATE TABLE "WorkFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "savedSearchId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    CONSTRAINT "WorkFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkFeedback_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkFeedback_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TopicPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "savedSearchId" TEXT NOT NULL,
    CONSTRAINT "TopicPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TopicPreference_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WorkFeedback_userId_savedSearchId_updatedAt_idx" ON "WorkFeedback"("userId", "savedSearchId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkFeedback_userId_savedSearchId_workId_key" ON "WorkFeedback"("userId", "savedSearchId", "workId");

-- CreateIndex
CREATE INDEX "TopicPreference_userId_savedSearchId_kind_idx" ON "TopicPreference"("userId", "savedSearchId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "TopicPreference_userId_savedSearchId_kind_value_key" ON "TopicPreference"("userId", "savedSearchId", "kind", "value");
