import { prisma } from "@aa/db/src/client";

async function main() {
  const rows = await prisma.$queryRawUnsafe('SELECT DISTINCT status FROM "WebhookEvents"');
  console.log(rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
