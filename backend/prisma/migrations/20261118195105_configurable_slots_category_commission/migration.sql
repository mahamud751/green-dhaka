-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "commissionPercent" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Config" ADD COLUMN     "slotDaysAhead" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "slotEndHour" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "slotStartHour" INTEGER NOT NULL DEFAULT 8;
