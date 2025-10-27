/*
  Warnings:

  - The values [wa,tg] on the enum `Platform` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[orgId,platform,externalId]` on the table `WebhookEvents` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `eventType` on the `WebhookEvents` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "WebhookEventType" AS ENUM ('MESSAGE', 'DELIVERY', 'STATUS');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');

-- AlterEnum
BEGIN;
CREATE TYPE "Platform_new" AS ENUM ('WHATSAPP', 'TELEGRAM');
ALTER TABLE "Contact" ALTER COLUMN "platform" TYPE "Platform_new" USING ("platform"::text::"Platform_new");
ALTER TABLE "WebhookEvents" ALTER COLUMN "platform" TYPE "Platform_new" USING ("platform"::text::"Platform_new");
ALTER TYPE "Platform" RENAME TO "Platform_old";
ALTER TYPE "Platform_new" RENAME TO "Platform";
DROP TYPE "Platform_old";
COMMIT;

-- AlterTable
ALTER TABLE "WebhookEvents" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "status" "WebhookStatus" NOT NULL DEFAULT 'RECEIVED',
DROP COLUMN "eventType",
ADD COLUMN     "eventType" "WebhookEventType" NOT NULL;

-- CreateIndex
CREATE INDEX "WebhookEvents_orgId_idx" ON "WebhookEvents"("orgId");

-- CreateIndex
CREATE INDEX "WebhookEvents_channelId_idx" ON "WebhookEvents"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvents_orgId_platform_externalId_key" ON "WebhookEvents"("orgId", "platform", "externalId");
