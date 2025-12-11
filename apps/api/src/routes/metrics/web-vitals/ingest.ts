import { SendMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs';
import { vValidator } from '@hono/valibot-validator';
import { type WebVitalRecord, WebVitalsBatchSchema } from '@tvseri.es/schemas';
import { Hono } from 'hono';
import { Resource } from 'sst';

import type { Variables } from '@/middleware/auth';

const sqs = new SQSClient({});

const app = new Hono<{ Variables: Variables }>();

/**
 * POST /metrics/web-vitals
 *
 * Receive batched web vitals metrics from the browser and queue for processing.
 * Accepts an array of metrics (batched on visibilitychange/pagehide).
 */
app.post('/', vValidator('json', WebVitalsBatchSchema), async (c) => {
  const metrics = c.req.valid('json') as Array<WebVitalRecord>;

  if (metrics.length === 0) {
    return c.body(null, 204);
  }

  // SQS SendMessageBatch supports max 10 messages per request
  const batches: Array<Array<WebVitalRecord>> = [];
  for (let i = 0; i < metrics.length; i += 10) {
    batches.push(metrics.slice(i, i + 10));
  }

  try {
    await Promise.all(
      batches.map((batch, batchIndex) =>
        sqs.send(
          new SendMessageBatchCommand({
            Entries: batch.map((metric, index) => ({
              Id: `${batchIndex}-${index}`,
              MessageBody: JSON.stringify(metric),
            })),
            QueueUrl: Resource.MetricsQueue.url,
          }),
        ),
      ),
    );
  } catch (error) {
    console.error('[metrics] Failed to queue web vitals batch:', error);
    return c.json({ error: 'Failed to process metrics' }, 500);
  }

  return c.body(null, 204);
});

export default app;
