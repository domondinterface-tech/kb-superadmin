-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "adminTempPassword" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "railwayProjectId" TEXT,
    "railwayServiceId" TEXT,
    "railwayEnvironmentId" TEXT,
    "appUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Tenant" ("adminEmail", "adminTempPassword", "appUrl", "brandName", "createdAt", "errorMessage", "id", "name", "railwayEnvironmentId", "railwayProjectId", "railwayServiceId", "status", "updatedAt") SELECT "adminEmail", "adminTempPassword", "appUrl", "brandName", "createdAt", "errorMessage", "id", "name", "railwayEnvironmentId", "railwayProjectId", "railwayServiceId", "status", "updatedAt" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
