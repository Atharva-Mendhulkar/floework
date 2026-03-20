-- CreateTable
CREATE TABLE "EstimationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "taskTitle" TEXT NOT NULL,
    "predictedEffort" TEXT NOT NULL,
    "actualHours" REAL NOT NULL,
    "extractedKeywords" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstimationRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EstimationRecord_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EstimationPattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "predictedEffort" TEXT NOT NULL,
    "actualAvgHours" REAL NOT NULL,
    "ratio" REAL NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EstimationPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EstimationRecord_taskId_key" ON "EstimationRecord"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "EstimationPattern_userId_keyword_predictedEffort_key" ON "EstimationPattern"("userId", "keyword", "predictedEffort");
