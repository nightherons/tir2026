-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Runner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "vanNumber" INTEGER NOT NULL,
    "runOrder" INTEGER NOT NULL,
    "projectedPace" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Runner_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Leg" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legNumber" INTEGER NOT NULL,
    "distance" REAL NOT NULL,
    "startPoint" TEXT,
    "endPoint" TEXT,
    "elevation" INTEGER,
    "difficulty" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LegResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legId" TEXT NOT NULL,
    "runnerId" TEXT NOT NULL,
    "clockTime" INTEGER NOT NULL,
    "startTime" DATETIME,
    "endTime" DATETIME,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "enteredBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LegResult_legId_fkey" FOREIGN KEY ("legId") REFERENCES "Leg" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LegResult_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "Runner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "teamId" TEXT,
    "vanNumber" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RaceConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Runner_pin_key" ON "Runner"("pin");

-- CreateIndex
CREATE UNIQUE INDEX "Runner_teamId_vanNumber_runOrder_key" ON "Runner"("teamId", "vanNumber", "runOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Leg_legNumber_key" ON "Leg"("legNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LegResult_legId_runnerId_key" ON "LegResult"("legId", "runnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RaceConfig_key_key" ON "RaceConfig"("key");
