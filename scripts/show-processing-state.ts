import { prisma } from '@aa/db/src/client';

async function main() {
  const rows = await prisma.webhookProcessingState.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });
  console.table(rows);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
