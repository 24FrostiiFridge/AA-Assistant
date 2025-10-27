import { dlqWebhook } from '../packages/queue/src/queue';

async function main() {
  // look across the typical states
  const jobs = await dlqWebhook.getJobs(
    ['waiting', 'active', 'delayed', 'completed', 'failed'],
    0,
    50
  );

  const rows = jobs.map(j => ({
    id: j.id,
    name: j.name,
    attemptsMade: j.attemptsMade,
    data: j.data,
    failedReason: j.failedReason,
  }));

  console.table(rows);
  process.exit(0);
}

main();
