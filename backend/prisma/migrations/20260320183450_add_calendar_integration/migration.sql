-- CreateTable
CREATE TABLE "GoogleCalendarConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "googleEmail" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "lastSynced" DATETIME,
    CONSTRAINT "GoogleCalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FocusCalendarEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gcalEventId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startHour" INTEGER NOT NULL,
    "endHour" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarConnection_userId_key" ON "GoogleCalendarConnection"("userId");
