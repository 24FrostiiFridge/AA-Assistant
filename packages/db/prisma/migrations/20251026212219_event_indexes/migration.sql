-- CreateIndex
CREATE INDEX "WebhookEvents_receivedAt_idx" ON "WebhookEvents"("receivedAt");

-- CreateIndex
CREATE INDEX "WebhookEvents_orgId_platform_idx" ON "WebhookEvents"("orgId", "platform");

-- CreateIndex
CREATE INDEX "WebhookEvents_orgId_externalId_idx" ON "WebhookEvents"("orgId", "externalId");
