import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { type PlexMetadata, type ScrobbleEvent } from '@tvseri.es/types';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { Resource } from 'sst';

import { findWebhookToken } from '@/lib/db/webhooks';

const app = new Hono();

const sqs = new SQSClient({});

app.post('/provider/:provider', async (c) => {
  const token = c.req.query('token');
  if (!token) {
    return c.json({ error: 'Missing token' }, 400);
  }

  const provider = c.req.param('provider');
  const webhookToken = await findWebhookToken(token);

  if (!webhookToken || webhookToken.type !== provider) {
    throw new HTTPException(401, {
      message: 'Invalid token',
    });
  }

  // Note: for now we only support Plex
  if (provider === 'plex') {
    try {
      const formData = await c.req.formData();
      const payloadJson = formData.get('payload');

      if (!payloadJson) {
        throw new HTTPException(400, {
          message: 'No payload found',
        });
      }

      let payload = null;
      try {
        payload = JSON.parse(payloadJson.toString()) as Readonly<{
          event: string;
          Metadata: PlexMetadata;
        }>;
      } catch (error) {
        console.error('Failed to parse payload:', {
          error,
          payload: payloadJson.toString(),
        });

        throw new HTTPException(500, {
          message: 'Failed to parse payload',
        });
      }

      if (
        payload.event !== 'media.scrobble' ||
        payload.Metadata.type !== 'episode' ||
        payload.Metadata.librarySectionType !== 'show'
      ) {
        return c.json({ message: 'OK' });
      }

      await sqs.send(
        new SendMessageCommand({
          QueueUrl: Resource.ScrobbleQueue.url,
          MessageBody: JSON.stringify({
            userId: webhookToken.userId,
            metadata: {
              plex: payload.Metadata,
            },
          } satisfies ScrobbleEvent),
        }),
      );

      console.log(
        `[SUCCESS] Scrobble queued | User: ${webhookToken.userId}`,
        JSON.stringify(payload),
      );

      return c.json({ message: 'OK' });
    } catch (error) {
      console.error('Failed to process Plex scrobble:', error);

      throw new HTTPException(500, {
        message: 'Failed to process Plex scrobble',
      });
    }
  }
});

export default app;
