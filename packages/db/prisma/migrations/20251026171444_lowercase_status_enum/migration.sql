/*
  Warnings:

  - The values [RECEIVED,PROCESSED,FAILED] on the enum `WebhookStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "WebhookStatus_new" AS ENUM ('received', 'processing', 'delivered', 'failed');
ALTER TABLE "WebhookEvents" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WebhookEvents" ALTER COLUMN "status" TYPE "WebhookStatus_new" USING ("status"::text::"WebhookStatus_new");
ALTER TYPE "WebhookStatus" RENAME TO "WebhookStatus_old";
ALTER TYPE "WebhookStatus_new" RENAME TO "WebhookStatus";
DROP TYPE "WebhookStatus_old";
ALTER TABLE "WebhookEvents" ALTER COLUMN "status" SET DEFAULT 'received';
COMMIT;

-- AlterTable
ALTER TABLE "WebhookEvents" ALTER COLUMN "status" SET DEFAULT 'received';
