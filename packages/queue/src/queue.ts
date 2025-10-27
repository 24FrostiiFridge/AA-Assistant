// packages/queue/src/queue.ts
import 'dotenv/config';
import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
console.log('[queue] Using REDIS_URL:', REDIS_URL);

export const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const queues = {
  webhookIngest: new Queue('webhook:ingest', { connection }),
  outboxDeliver: new Queue('outbox:deliver', { connection }),
  dlq:           new Queue('dlq', { connection }),
};

export const dlqWebhook = new Queue('dlq:webhook', { connection });

export const events = {
  webhookIngest: new QueueEvents('webhook:ingest', { connection }),
  outboxDeliver: new QueueEvents('outbox:deliver', { connection }),
};

export function jobOpts(overrides: JobsOptions = {}): JobsOptions {
  return {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
    ...overrides,
  };
}

wireDLQ('webhook:ingest', dlqWebhook);
console.log('[dlq] wired for webhook:ingest');

/**
 * Optional helper if you want to mirror exhausted jobs into a DLQ.
 * Call: wireDLQ('webhook:ingest', dlqWebhook);
 */
export function wireDLQ(queueName: string, dlq: Queue) {
  const qe = new QueueEvents(queueName, { connection });
  qe.on('failed', async ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
    await dlq.add('failed', {
      queue: queueName,
      jobId,
      reason: failedReason,
      when: new Date().toISOString(),
    });
  });
  return qe;
}
