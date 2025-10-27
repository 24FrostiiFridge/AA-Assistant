# aa-assistant

- Webhook ingest worker (WhatsApp / Telegram)
- Idempotent inserts via unique `idempotencyKey`
- DLQ (dead-letter queue) with BullMQ
- Postgres schema, migrations, and indexes
- Org + channel seeding scripts
- Health checks for Redis and DB
