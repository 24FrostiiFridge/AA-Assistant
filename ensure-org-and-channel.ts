// ensure-org-and-channel.ts
import { prisma } from './packages/db/src/client.ts';

async function getEnumValues(enumName: string): Promise<string[]> {
  // Pull enum labels from Postgres
  const rows = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
    SELECT e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = ${enumName}
    ORDER BY e.enumsortorder;
  `;
  return rows.map(r => r.enumlabel);
}

async function run() {
  const ORG_ID = 'org_dev';

  // 1) Ensure Organization exists
  const org = await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: { id: ORG_ID, name: 'Dev Org' } as any, // add other required fields if your model has them
    select: { id: true, name: true }
  });
  console.log('ORG:', org);

  // 2) Pick a valid ChannelType enum value
  const enumVals = await getEnumValues('ChannelType');
  const typeVal = enumVals.find(v => /telegram/i.test(v)) ?? enumVals.find(v => /whatsapp/i.test(v)) ?? enumVals[0];
  if (!typeVal) {
    throw new Error('No values found for enum "ChannelType". Check your schema/migrations.');
  }
  console.log('ChannelType selected:', typeVal);

  // 3) Find (or create) a Channel for this org
  let chan = await prisma.channel.findFirst({
    where: { orgId: ORG_ID },
    select: { id: true, orgId: true, type: true }
  });

  if (!chan) {
    chan = await prisma.channel.create({
      data: {
        orgId: ORG_ID,
        type: typeVal as any,               // enum value
        displayName: 'Dev channel',
        creds: {} as any                    // JSON field required by your model
        // status will default to 'active'
      },
      select: { id: true, orgId: true, type: true }
    });
  }

  console.log('CHANNEL:', chan);
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
