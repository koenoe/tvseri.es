import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Resource } from 'sst';

import { type PlexMetadata, type ScrobbleEvent } from '@/lambdas/scrobble';
import { findWebhookToken } from '@/lib/db/webhooks';

const sqs = new SQSClient({});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return Response.json({ error: 'Missing token' }, { status: 400 });
  }

  const [{ provider }, webhookToken] = await Promise.all([
    params,
    findWebhookToken(token),
  ]);

  if (!webhookToken || webhookToken.type !== provider) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Note: for now we only support Plex
  if (provider === 'plex') {
    try {
      const formData = await request.formData();
      const payloadJson = formData.get('payload');

      if (!payloadJson) {
        return Response.json({ error: 'No payload found' }, { status: 400 });
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

        return Response.json(
          { error: 'Failed to parse payload' },
          { status: 500 },
        );
      }

      if (
        payload.event !== 'media.scrobble' ||
        payload.Metadata.type !== 'episode' ||
        payload.Metadata.librarySectionType !== 'show'
      ) {
        return Response.json({ message: 'OK' }, { status: 200 });
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

      return Response.json({ message: 'OK' });
    } catch (error) {
      console.error('Failed to process Plex scrobble:', error);

      return Response.json(
        { error: 'Failed to process Plex scrobble' },
        { status: 500 },
      );
    }
  }

  return Response.json({ error: 'Invalid provider' }, { status: 400 });
}
