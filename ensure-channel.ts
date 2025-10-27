// ensure-channel.ts
import { prisma } from './packages/db/src/client.ts';

// We *optionally* import ChannelType if your Prisma generated it as an enum.
// If it doesn't exist, the dynamic import will fail and we fallback to string.
async function pickChannelType(): Promise<string> {
  try {
    // Dynamically import to avoid hard compile failures if enum doesn't exist
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const mod = await import('./packages/db/node_modules/@prisma/client/index.js');
    const ChannelType = (mod as any).ChannelType as Record<string, string> | undefined;

    if (ChannelType && Object.values(ChannelType).length > 0) {
      // Prefer telegram/whatsapp if present, otherwise take the first enum value
      const vals = Object.values(ChannelType);
      const preferred = vals.find(v => /telegram/i.test(v)) ?? vals.find(v => /whatsapp/i.test(v));
      return preferred ?? vals[0];
    }
  } catch {
    // fall through to string fallback
  }
  // Fallback if no enum: assume your column is text
  return 'telegram';
}

async function run() {
  // 1) Try to find an existing channel for org_dev
  let chan = await prisma.channel.findFirst({
    select: { id: true, orgId: true },
    where:  { orgId: 'org_dev' } as any,
  });

  if (!chan) {
    // 2) Create one with all required fields for your model
    const typeVal = await pickChannelType();

    // Minimal sensible defaults
    const data: any = {
      orgId: 'org_dev',
      type: typeVal,                  // works for enum or text (enum picked dynamically)
      displayName: 'Dev channel',     // required by your table
      creds: {},                      // JSON column (non-null) — adjust later to real creds
      // status is NOT needed; DB default = 'active'
    };

    try {
      chan = await prisma.channel.create({
        data,
        select: { id: true, orgId: true }
      });
    } catch (e: any) {
      console.error('\nChannel create failed. Prisma says:\n', e?.message ?? e);

      // Print columns to guide the exact shape (already saw these, but keep for completeness)
      try {
        const cols = await prisma.$queryRaw<
          { column_name: string; is_nullable: string; column_default: string | null }[]
        >`
          SELECT column_name, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Channel'
          ORDER BY ordinal_position;
        `;
        console.log('\nColumns in "Channel":');
        for (const c of cols) {
          console.log(`  ${c.column_name}  nullable=${c.is_nullable}  default=${c.column_default ?? 'NULL'}`);
        }
      } catch (metaErr) {
        console.error('\nFailed to introspect columns:', metaErr);
      }

      console.log('\nEdit ensure-channel.ts -> data = { ... } to include any other required fields.');
      process.exit(1);
    }
  }

  console.log('CHANNEL:', chan);
}

run().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
