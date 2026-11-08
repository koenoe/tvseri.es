import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import {
  PLEX_SCROBBLE_EVENT,
  type ScrobbleProvider,
} from '@tvseri.es/constants';
import type {
  PlexMetadata,
  ScrobbleEvent,
  ScrobbleMetadata,
} from '@tvseri.es/schemas';
import { type Context, Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { Resource } from 'sst';

import { findWebhookToken } from '@/lib/db/webhooks';

const app = new Hono();

const sqs = new SQSClient({});

type PlexPayload = Readonly<{
  event: string;
  Metadata?: PlexMetadata;
}>;

/**
 * Reads the Plex webhook body. Throws a 400 for a missing or malformed
 * payload, and a 500 for any other failure (e.g. an unreadable body).
 */
const parsePlexPayload = async (c: Context): Promise<PlexPayload> => {
  try {
    const formData = await c.req.formData();
    const payloadJson = formData.get('payload');

    if (!payloadJson) {
      throw new HTTPException(400, {
        message: 'No payload found',
      });
    }

    try {
      return JSON.parse(payloadJson.toString()) as PlexPayload;
    } catch {
      throw new HTTPException(400, {
        message: 'Failed to parse payload',
      });
    }
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }

    console.error('Failed to process Plex scrobble:', error);

    throw new HTTPException(500, {
      message: 'Failed to process Plex scrobble',
    });
  }
};

/** Only watched episodes from a TV library are scrobbled */
const isEpisodeScrobble = (
  payload: PlexPayload,
): payload is PlexPayload & Readonly<{ Metadata: PlexMetadata }> =>
  payload.event === PLEX_SCROBBLE_EVENT &&
  payload.Metadata?.type === 'episode' &&
  payload.Metadata.librarySectionType === 'show';

/**
 * One adapter per provider in SCROBBLE_PROVIDERS: reads the webhook body and
 * returns the scrobble's metadata, or null for anything that isn't a watched
 * episode (those are answered 200 and ignored).
 */
const adapters: Record<
  ScrobbleProvider,
  (c: Context) => Promise<ScrobbleMetadata | null>
> = {
  plex: async (c) => {
    const payload = await parsePlexPayload(c);
    return isEpisodeScrobble(payload) ? { plex: payload.Metadata } : null;
  },
};

const isScrobbleProvider = (provider: string): provider is ScrobbleProvider =>
  Object.hasOwn(adapters, provider);

const findValidToken = async (token: string, provider: string) => {
  const webhookToken = await findWebhookToken(token);

  if (!webhookToken || webhookToken.type !== provider) {
    throw new HTTPException(401, {
      message: 'Invalid token',
    });
  }

  return webhookToken;
};

/**
 * Called by media servers without the API key: the edge function only lets a
 * request through when its token is in the KeyValueStore for this provider
 * (infra/apiEdgeInjection.ts). The token row is still read here, but only for
 * real scrobbles, since it holds the user id.
 */
app.post('/provider/:provider', async (c) => {
  const provider = c.req.param('provider');
  if (!isScrobbleProvider(provider)) {
    return c.notFound();
  }

  const token = c.req.query('token');
  if (!token) {
    return c.json({ error: 'Missing token' }, 400);
  }

  const metadata = await adapters[provider](c);
  if (!metadata) {
    return c.json({ message: 'OK' });
  }

  const webhookToken = await findValidToken(token, provider);

  try {
    await sqs.send(
      new SendMessageCommand({
        MessageBody: JSON.stringify({
          metadata,
          userId: webhookToken.userId,
        } satisfies ScrobbleEvent),
        QueueUrl: Resource.ScrobbleQueue.url,
      }),
    );
  } catch (error) {
    console.error(`Failed to queue ${provider} scrobble:`, error);

    throw new HTTPException(500, {
      message: 'Failed to process scrobble',
    });
  }

  // Don't log the full payload: it contains account/server details
  console.log(
    `[SUCCESS] Scrobble queued | User: ${webhookToken.userId} | Provider: ${provider}`,
  );

  return c.json({ message: 'OK' });
});

export default app;
