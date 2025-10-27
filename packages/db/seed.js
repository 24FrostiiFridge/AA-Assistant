import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: 'dev-org' },
    update: {},
    create: { id: 'dev-org', name: 'Dev Org', region: 'dev' },
  });

  const user = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: { email: 'owner@example.com', name: 'Owner' },
  });

  await prisma.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: { role: 'owner' },
    create: { userId: user.id, orgId: org.id, role: 'owner' },
  });

  const channel = await prisma.channel.upsert({
    where: { id: 'dev-wa' },
    update: {},
    create: {
      id: 'dev-wa',
      orgId: org.id,
      type: 'whatsapp',
      status: 'active',
      displayName: 'Dev WhatsApp',
      creds: { placeholder: true }
    },
  });

  console.log({ org, user, channel });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
