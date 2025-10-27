// enqueue-fail.ts
import { queues, jobOpts } from './packages/queue/src/queue';

async function main() {
  await queues.webhookIngest.add(
    'test-fail',
    {
      source: 'telegram',
      externalId: 'debug:fail-1',        // keep this constant to re-test retries/ DLQ
      payload: { forceFail: true },      // <- this triggers the failure
    },
    jobOpts({ attempts: 2, backoff: { type: 'fixed', delay: 500 } })
  );
  console.log('enqueued failing job');
  process.exit(0);
}

main();
