// packages/queue/enqueue.ts
import { queues, jobOpts } from './src/queue';

async function main() {
  await queues.webhookIngest.add(
    'test',
    {
      source: 'telegram',
      externalId: 'debug:ok-5',     // 👈 fresh id for this test
      payload: { hello: 'works!' }, // 👈 no forceFail
    },
    jobOpts()
  );
  console.log('enqueued');
  process.exit(0);
}

main();
