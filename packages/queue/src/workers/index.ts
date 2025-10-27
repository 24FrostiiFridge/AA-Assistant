import 'dotenv/config';
import { startWebhookIngestWorker } from './webhookIngest.js';
import { startOutboxDeliverWorker } from './outboxDeliver.js';

startWebhookIngestWorker();
startOutboxDeliverWorker();
