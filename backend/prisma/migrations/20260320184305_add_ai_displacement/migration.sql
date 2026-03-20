-- CreateTable
CREATE TABLE "AIDisplacementSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weekLabel" TEXT NOT NULL,
    "aiHours" REAL NOT NULL,
    "humanHours" REAL NOT NULL,
    "aiTaskEfforts" TEXT NOT NULL,
    "humanTaskEfforts" TEXT NOT NULL,
    "insightText" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIDisplacementSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FocusSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "durationSecs" INTEGER NOT NULL DEFAULT 0,
    "interrupts" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" REAL,
    "aiAssisted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "FocusSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FocusSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FocusSession" ("durationSecs", "endTime", "id", "interrupts", "qualityScore", "startTime", "taskId", "userId") SELECT "durationSecs", "endTime", "id", "interrupts", "qualityScore", "startTime", "taskId", "userId" FROM "FocusSession";
DROP TABLE "FocusSession";
ALTER TABLE "new_FocusSession" RENAME TO "FocusSession";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AIDisplacementSummary_userId_weekLabel_key" ON "AIDisplacementSummary"("userId", "weekLabel");
