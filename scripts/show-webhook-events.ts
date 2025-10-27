// scripts/show-webhook-events.ts
import { prisma } from '@aa/db/src/client';

async function main() {
  const rows = await prisma.webhookEvents.findMany({
    select: { id: true, idempotencyKey: true, status: true },
    orderBy: { receivedAt: 'desc' },
    take: 5,
  });
  console.table(rows);
  process.exit(0);
}

main();
