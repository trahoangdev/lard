/*
  Warnings:

  - Added the required column `sourceRowNumber` to the `payroll_items` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_payroll_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "runId" INTEGER NOT NULL,
    "sourceRowNumber" INTEGER NOT NULL,
    "employeeName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bankAccount" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "message" TEXT,
    "processedAt" DATETIME,
    CONSTRAINT "payroll_items_runId_fkey" FOREIGN KEY ("runId") REFERENCES "payroll_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_payroll_items" ("amount", "bankAccount", "email", "employeeName", "id", "message", "processedAt", "runId", "status") SELECT "amount", "bankAccount", "email", "employeeName", "id", "message", "processedAt", "runId", "status" FROM "payroll_items";
DROP TABLE "payroll_items";
ALTER TABLE "new_payroll_items" RENAME TO "payroll_items";
CREATE INDEX "payroll_items_runId_idx" ON "payroll_items"("runId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
