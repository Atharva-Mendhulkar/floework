-- CreateTable
CREATE TABLE "EffortNarrative" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weekLabel" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT,
    "shareExpiry" DATETIME,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EffortNarrative_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EffortNarrative_shareToken_key" ON "EffortNarrative"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "EffortNarrative_userId_weekLabel_key" ON "EffortNarrative"("userId", "weekLabel");
