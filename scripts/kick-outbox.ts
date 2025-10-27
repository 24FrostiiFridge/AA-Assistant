import { queues, jobOpts } from '../packages/queue/src/queue';

async function main() {
  await queues.outboxDeliver.add('noop', { ts: Date.now() }, jobOpts());
  console.log('outbox enqueued');
  process.exit(0);
}
main();
