import { Worker } from 'bullmq';
import { connection } from '../queue';

type OutboxJob = {
  provider?: string;
  channelId?: string;
  messageId?: string;
};

export function startOutboxDeliverWorker() {
  const worker = new Worker<OutboxJob>(
    'outbox:deliver',
    async (job) => {
      const { provider, channelId, messageId } = job.data ?? {};
      if (!provider || !channelId || !messageId) {
        // Quiet noop until real deliver logic is added.
        return;
      }
      console.log('[outbox:deliver] delivering', { provider, channelId, messageId });
      // TODO: actual send goes here
    },
    { connection }
  );

  worker.on('failed', (job, err) => {
    console.error('[outbox:deliver] failed', job?.attemptsMade, err?.message);
  });

  console.log('OutboxDeliverWorker started');
  return worker;
}
