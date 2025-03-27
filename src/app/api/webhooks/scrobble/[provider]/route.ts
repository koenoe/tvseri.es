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

  console.log('[DEBUG] Received webhook request');

  if (!token) {
    return Response.json({ error: 'Missing token' }, { status: 400 });
  }

  const { provider } = await params;
  console.log(`[DEBUG] Provider: ${provider}`);

  const webhookToken = await findWebhookToken(token);

  if (!webhookToken || webhookToken.type !== provider) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Note: for now we only support Plex
  if (provider === 'plex') {
    try {
      // Clone the request to read the raw body
      const clonedRequest = request.clone();
      const rawBody = await clonedRequest.text();
      console.log('[DEBUG] Raw request body:', rawBody);

      // Now process the form data from the original request
      const formData = await request.formData();

      // Log all form data entries
      console.log('[DEBUG] Form data entries:');
      for (const [key, value] of formData.entries()) {
        const valueType = value instanceof File ? 'File' : typeof value;
        const valuePreview =
          value instanceof File
            ? `File: ${value.name}, size: ${value.size}, type: ${value.type}`
            : String(value).substring(0, 100) +
              (String(value).length > 100 ? '...' : '');

        console.log(`[DEBUG] - ${key} (${valueType}): ${valuePreview}`);
      }

      // Get the payload
      const payloadItem = formData.get('payload');
      console.log(
        `[DEBUG] payload type: ${typeof payloadItem}, instanceof File: ${payloadItem instanceof File}`,
      );

      if (!payloadItem) {
        return Response.json({ error: 'No payload found' }, { status: 400 });
      }

      let payloadString;

      // Handle different payload types
      if (payloadItem instanceof File) {
        console.log(
          `[DEBUG] Payload is a File. Name: ${payloadItem.name}, Size: ${payloadItem.size}, Type: ${payloadItem.type}`,
        );
        payloadString = await payloadItem.text();
        console.log(
          '[DEBUG] File content (first 200 chars):',
          payloadString.substring(0, 200),
        );
      } else {
        payloadString = String(payloadItem);
        console.log(
          '[DEBUG] Payload string (first 200 chars):',
          payloadString.substring(0, 200),
        );
      }

      try {
        const payload = JSON.parse(payloadString) as Readonly<{
          event: string;
          Metadata: PlexMetadata;
        }>;

        console.log('[DEBUG] Successfully parsed JSON payload');

        if (
          payload.event !== 'media.scrobble' ||
          payload.Metadata.type !== 'episode' ||
          payload.Metadata.librarySectionType !== 'show'
        ) {
          console.log(
            '[DEBUG] Skipping non-TV show scrobble event:',
            payload.event,
            payload.Metadata?.type,
            payload.Metadata?.librarySectionType,
          );
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
      } catch (parseError) {
        console.error('[DEBUG] JSON parse error:', parseError);
        console.log('[DEBUG] Content that failed to parse:', payloadString);
        throw parseError; // Rethrow to be caught by outer catch block
      }
    } catch (error) {
      console.error('Failed to process Plex scrobble:', error);

      return Response.json(
        { error: `Failed to process Plex scrobble: ${error}` },
        { status: 500 },
      );
    }
  }

  return Response.json({ error: 'Invalid provider' }, { status: 400 });
}
