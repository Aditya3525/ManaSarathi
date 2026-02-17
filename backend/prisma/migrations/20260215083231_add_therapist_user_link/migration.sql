-- AlterTable
ALTER TABLE "therapist_bookings" ADD COLUMN "therapistNotes" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_therapists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "credential" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "userId" TEXT,
    "specialtiesJson" TEXT NOT NULL DEFAULT '[]',
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "acceptsInsurance" BOOLEAN NOT NULL DEFAULT false,
    "insurances" TEXT,
    "sessionFee" REAL,
    "offersSliding" BOOLEAN NOT NULL DEFAULT false,
    "availabilityJson" TEXT NOT NULL DEFAULT '[]',
    "profileImageUrl" TEXT,
    "yearsExperience" INTEGER,
    "languages" TEXT,
    "rating" REAL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "therapists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_therapists" ("acceptsInsurance", "availabilityJson", "bio", "city", "country", "createdAt", "credential", "email", "id", "insurances", "isActive", "isVerified", "languages", "name", "offersSliding", "phone", "profileImageUrl", "rating", "reviewCount", "sessionFee", "specialtiesJson", "state", "street", "title", "updatedAt", "website", "yearsExperience", "zipCode") SELECT "acceptsInsurance", "availabilityJson", "bio", "city", "country", "createdAt", "credential", "email", "id", "insurances", "isActive", "isVerified", "languages", "name", "offersSliding", "phone", "profileImageUrl", "rating", "reviewCount", "sessionFee", "specialtiesJson", "state", "street", "title", "updatedAt", "website", "yearsExperience", "zipCode" FROM "therapists";
DROP TABLE "therapists";
ALTER TABLE "new_therapists" RENAME TO "therapists";
CREATE UNIQUE INDEX "therapists_userId_key" ON "therapists"("userId");
CREATE INDEX "therapists_userId_idx" ON "therapists"("userId");
CREATE INDEX "therapists_isActive_idx" ON "therapists"("isActive");
CREATE INDEX "therapists_isVerified_idx" ON "therapists"("isVerified");
CREATE INDEX "therapists_city_state_idx" ON "therapists"("city", "state");
CREATE INDEX "therapists_rating_idx" ON "therapists"("rating");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
