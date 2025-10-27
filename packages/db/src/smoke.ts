import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const r = await prisma.$queryRaw`SELECT 1 as ok`;
  console.log(r);
  await prisma.$disconnect();
}
main().catch(e => (console.error(e), process.exit(1)));