-- CreateTable
CREATE TABLE "GitHubConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "githubLogin" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GitHubConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LinkedPR" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "prTitle" TEXT,
    "state" TEXT NOT NULL DEFAULT 'open',
    "openedAt" DATETIME,
    "mergedAt" DATETIME,
    "lastChecked" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LinkedPR_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LinkedPR_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GitHubConnection_userId_key" ON "GitHubConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkedPR_taskId_owner_repo_prNumber_key" ON "LinkedPR"("taskId", "owner", "repo", "prNumber");
