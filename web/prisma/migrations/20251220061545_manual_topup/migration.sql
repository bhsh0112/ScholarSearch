-- CreateTable
CREATE TABLE "ManualTopup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "provider" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amountCny" INTEGER NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "note" TEXT,
    "userConfirmedAt" DATETIME,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ManualTopup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ManualTopup_referenceCode_key" ON "ManualTopup"("referenceCode");

-- CreateIndex
CREATE INDEX "ManualTopup_userId_createdAt_idx" ON "ManualTopup"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ManualTopup_status_createdAt_idx" ON "ManualTopup"("status", "createdAt");
