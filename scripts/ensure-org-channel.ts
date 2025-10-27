import { prisma } from '@aa/db/src/client';
import { Prisma } from '@prisma/client';

// -------- helpers: pick model + enum label safely ----------------------------
function pickOrgModel(p: any) {
  // Try common names. Add more here if your schema is different.
  return p.org ?? p.organization ?? p.organisation ?? p.organizations ?? p.Organisation ?? p.Organization;
}

function resolveChannelTypeLabel(): string {
  // If Prisma exposes enum values, prefer them.
  const Enums = (Prisma as any).$Enums ?? (Prisma as any);
  const ChannelType = Enums?.ChannelType;

  if (ChannelType) {
    // Prefer a telegram-ish label if present
    if (ChannelType.telegram) return ChannelType.telegram;   // e.g. 'telegram'
    if (ChannelType.TELEGRAM) return ChannelType.TELEGRAM;   // e.g. 'TELEGRAM'
    // fallback to first enum key’s value (rarely needed)
    const first = Object.values(ChannelType)[0];
    if (typeof first === 'string') return first;
  }

  // Last resort: most schemas use lowercase 'telegram'
  return 'telegram';
}

// Some schemas require status/displayName/creds.
function defaultChannelData(orgId: string) {
  const type = resolveChannelTypeLabel();
  return {
    orgId,
    type,                     // enum/text label that your schema will accept
    status: 'active' as any,  // ok if your schema ignores/has default
    displayName: 'Dev Telegram',
    creds: {} as any,         // Json field if required
  };
}

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------
const ORG_ID = process.env.ORG_FALLBACK_ID ?? 'org_dev';

async function main() {
  const p: any = prisma;
  const OrgModel = pickOrgModel(p);
  if (!OrgModel) {
    throw new Error(
      'Could not find an Org model on Prisma Client. Try renaming in this script: org / organization / Organisation.'
    );
  }

  // 1) Upsert Org/Organization
  const org = await OrgModel.upsert({
    where: { id: ORG_ID },
    update: {},
    create: { id: ORG_ID, name: 'Dev Org' },
    select: { id: true, name: true },
  });

  // 2) Find or create Channel for that org
  let channel = await p.channel.findFirst({
    where: { orgId: org.id },
    select: { id: true, orgId: true, type: true, displayName: true },
  });

  if (!channel) {
    channel = await p.channel.create({
      data: defaultChannelData(org.id),
      select: { id: true, orgId: true, type: true, displayName: true },
    });
  }

  console.log('Org/Organization:');
  console.table([org]);
  console.log('Channel:');
  console.table([channel]);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
