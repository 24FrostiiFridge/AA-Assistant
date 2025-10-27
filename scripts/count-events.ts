import { prisma } from '@aa/db/src/client';
prisma.webhookEvents.count().then(c => (console.log({count: c}), process.exit(0)));