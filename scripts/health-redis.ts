import IORedis from 'ioredis';

const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
const r = new IORedis(url, { maxRetriesPerRequest: null, enableReadyCheck: false });

r.ping().then(x => {
  console.log({ redis: x }); // expect: { redis: 'PONG' }
  process.exit(0);
}).catch(err => {
  console.error('redis health failed:', err);
  process.exit(1);
});
