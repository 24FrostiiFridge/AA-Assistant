/*
  Warnings:

  - The values [received,processing,delivered,failed] on the enum `WebhookStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "WebhookStatus_new" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');
ALTER TABLE "WebhookEvents" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WebhookEvents" ALTER COLUMN "status" TYPE "WebhookStatus_new" USING ("status"::text::"WebhookStatus_new");
ALTER TYPE "WebhookStatus" RENAME TO "WebhookStatus_old";
ALTER TYPE "WebhookStatus_new" RENAME TO "WebhookStatus";
DROP TYPE "WebhookStatus_old";
ALTER TABLE "WebhookEvents" ALTER COLUMN "status" SET DEFAULT 'RECEIVED';
COMMIT;

-- AlterTable
ALTER TABLE "WebhookEvents" ALTER COLUMN "status" SET DEFAULT 'RECEIVED';

-- CreateTable
CREATE TABLE "WebhookProcessingState" (
    "idempotencyKey" TEXT NOT NULL,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL,
    "error" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookProcessingState_pkey" PRIMARY KEY ("idempotencyKey")
);
