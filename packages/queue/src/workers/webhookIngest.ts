// packages/queue/src/workers/webhookIngest.ts
import { Worker } from 'bullmq';
import { prisma } from '@aa/db/src/client.js';
import { Prisma } from '@prisma/client';
import { connection, dlqWebhook } from '../queue.js';

const ORG_FALLBACK_ID = process.env.ORG_FALLBACK_ID ?? 'org_dev';

// Optional explicit overrides if your enum labels in PG are non-standard.
// Example:
//   PLATFORM_TELEGRAM=telegram_bot
//   PLATFORM_WHATSAPP=whatsapp_business
//   EVENTTYPE_MESSAGE=incoming_message
const PLATFORM_TELEGRAM = process.env.PLATFORM_TELEGRAM;
const PLATFORM_WHATSAPP = process.env.PLATFORM_WHATSAPP;
const EVENTTYPE_MESSAGE = process.env.EVENTTYPE_MESSAGE;

type IngestJob = {
  source: 'whatsapp' | 'telegram';
  externalId: string;
  payload: unknown;
};

// ───────────────────────── enum helpers ─────────────────────────

async function lookupEnumLabels(enumTypeName: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ enumlabel: string }[]>`
    SELECT e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE lower(t.typname) = lower(${enumTypeName})
    ORDER BY e.enumsortorder
  `;
  return rows.map(r => r.enumlabel);
}

async function resolvePlatformLabel(src: 'whatsapp' | 'telegram'): Promise<string> {
  // 1) ENV overrides (fast/explicit)
  if (src === 'telegram' && PLATFORM_TELEGRAM) return PLATFORM_TELEGRAM;
  if (src === 'whatsapp' && PLATFORM_WHATSAPP) return PLATFORM_WHATSAPP;

  // 2) Try likely enum type names
  for (const typeName of ['Platform', 'platform', 'platform_enum', 'platformtype']) {
    const labels = await lookupEnumLabels(typeName).catch(() => []);
    if (labels.length) {
      const exact = labels.find(l => l.toLowerCase() === src.toLowerCase());
      if (exact) return exact;
      const fuzzy = labels.find(l => l.toLowerCase().includes(src));
      if (fuzzy) return fuzzy;
    }
  }

  // 3) Fallback: if DB uses TEXT instead of enum, just use the source as-is
  return src.toLowerCase();
}

async function resolveEventTypeLabel(src: 'message'): Promise<string> {
  if (EVENTTYPE_MESSAGE) return EVENTTYPE_MESSAGE;

  for (const typeName of ['WebhookEventType', 'webhookeventtype', 'webhook_event_type', 'eventtype']) {
    const labels = await lookupEnumLabels(typeName).catch(() => []);
    if (labels.length) {
      const exact = labels.find(l => l.toLowerCase() === src.toLowerCase());
      if (exact) return exact;
      const fuzzy = labels.find(l => l.toLowerCase().includes(src));
      if (fuzzy) return fuzzy;
    }
  }

  // TEXT fallback
  return src.toLowerCase();
}

// ───────────────────────── worker ─────────────────────────

export function startWebhookIngestWorker() {
  const worker = new Worker<IngestJob>(
    'webhook:ingest',
    async (job) => {
      const { source, externalId, payload } = job.data;
      console.log('[ingest] job', { source, externalId });

      // 1) Attach to any channel under this org
      const channel = await prisma.channel.findFirst({
        where: { orgId: ORG_FALLBACK_ID },
        select: { id: true, orgId: true, type: true },
      });

      if (!channel) {
        throw new Error('No Channel exists for org_dev. Run `npx tsx ensure-channel.ts` first.');
      }

      // 2) Resolve enum/text labels that the DB will accept
      const platformLabel = await resolvePlatformLabel(source);      // e.g., 'TELEGRAM' or 'telegram_bot' or 'telegram'
      const eventTypeLabel = await resolveEventTypeLabel('message'); // e.g., 'MESSAGE' or 'message'

      // 3) Idempotency
      const idempotencyKey = `${source}:${externalId}`;

      // 4) Debug preview
      console.log('[ingest] about to insert', {
        orgId: ORG_FALLBACK_ID,
        channelId: channel.id,
        platform: platformLabel,
        eventType: eventTypeLabel,
        idempotencyKey,
        externalId,
        status: 'received',
      });

      // 5) Insert (idempotent on unique idempotencyKey)
      try {

        if ((payload as any)?.forceFail) {
        throw new Error('forced-failure-for-dlq-test');
      }
        await prisma.webhookEvents.create({
          data: {
            orgId: ORG_FALLBACK_ID,
            channelId: channel.id,
            platform: platformLabel as any,         // enum label or text, depending on your schema
            eventType: eventTypeLabel as any,       // idem
            idempotencyKey,
            // If your schema actually has a `provider` column, uncomment next line:
            // provider: source,
            externalId,
            payload: payload as Prisma.InputJsonValue,
            // Prefer Prisma enum if present, otherwise uppercase string (your DB shows 'RECEIVED').
            status: (Prisma as any).WebhookStatus?.RECEIVED ?? 'RECEIVED',
          },
        });

        await prisma.webhookProcessingState.upsert({
              where:  { idempotencyKey },
              create: { idempotencyKey, attempts: 1, state: 'received' },
              update: { attempts: { increment: 1 }, 
                        lastAttemptAt: new Date(), 
                        state: 'received', 
                        error: null 
           },
});

      } catch (e: any) {
        // Idempotency: ignore duplicate (unique on idempotencyKey)
        if (e?.code === 'P2002') {
          console.log('[ingest] duplicate (idempotent):', idempotencyKey);
          
          await prisma.webhookProcessingState.upsert({
               where:  { idempotencyKey },
               create: { idempotencyKey, attempts: 1, state: 'received' },
               update: {
                         attempts:     { increment: 1 },
                         lastAttemptAt: new Date(),
                         state:         'received',
      },
    });

          return;
        }
        throw e;
      }
    },
    { connection }
  );

  // Single global failed handler (outside processor)
  worker.on('failed', async (job, err) => {
    console.error('[webhook:ingest] failed', job?.attemptsMade, err?.message);
    // Mirror exhausted jobs to DLQ for visibility
    if (job && job.attemptsMade >= (job.opts?.attempts ?? 1)) {
      await dlqWebhook.add('exhausted', {
        queue: 'webhook:ingest',
        data: job.data,
        attemptsMade: job.attemptsMade,
        reason: err?.message,
        when: new Date().toISOString(),
      });
    }
  });

  console.log('WebhookIngestWorker started');
  return worker;
}
