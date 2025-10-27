import { prisma } from '@aa/db/src/client';

prisma.$queryRaw`SELECT 1`.then(() => {
  console.log({ db: 'ok' });
  process.exit(0);
}).catch(err => {
  console.error('db health failed:', err);
  process.exit(1);
});
