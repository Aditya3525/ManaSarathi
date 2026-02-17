-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT,
    "googleId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "profilePhoto" TEXT,
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "approach" TEXT,
    "birthday" DATETIME,
    "gender" TEXT,
    "region" TEXT,
    "language" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "dataConsent" BOOLEAN NOT NULL DEFAULT false,
    "clinicianSharing" BOOLEAN NOT NULL DEFAULT false,
    "anonymousAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
    "researchParticipation" BOOLEAN NOT NULL DEFAULT false,
    "consentUpdatedAt" DATETIME,
    "deletionRequestedAt" DATETIME,
    "securityQuestion" TEXT,
    "securityAnswerHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("approach", "birthday", "clinicianSharing", "createdAt", "dataConsent", "email", "emergencyContact", "emergencyPhone", "firstName", "gender", "googleId", "id", "isOnboarded", "isPremium", "language", "lastName", "name", "password", "profilePhoto", "region", "securityAnswerHash", "securityQuestion", "updatedAt") SELECT "approach", "birthday", "clinicianSharing", "createdAt", "dataConsent", "email", "emergencyContact", "emergencyPhone", "firstName", "gender", "googleId", "id", "isOnboarded", "isPremium", "language", "lastName", "name", "password", "profilePhoto", "region", "securityAnswerHash", "securityQuestion", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_googleId_idx" ON "users"("googleId");
CREATE INDEX "users_isOnboarded_idx" ON "users"("isOnboarded");
CREATE INDEX "users_approach_idx" ON "users"("approach");
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
