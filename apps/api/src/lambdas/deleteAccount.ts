import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { Context, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { Resource } from 'sst';

import {
  type DeleteAccountMessage,
  NEXT_STEP,
  runDeleteAccountStep,
} from '@/lib/account/delete';

const sqs = new SQSClient({});

/** Stop a minute before the Lambda timeout and queue the rest */
const SAFETY_MS = 60_000;

const queue = (message: DeleteAccountMessage, delaySeconds?: number) =>
  sqs.send(
    new SendMessageCommand({
      DelaySeconds: delaySeconds,
      MessageBody: JSON.stringify(message),
      QueueUrl: Resource.DeleteAccountQueue.url,
    }),
  );

/**
 * Delete account, one step per message (batch size 1). A step that
 * doesn't fit one run continues in a new message; the next step is queued
 * with a delay. Failures are reported per message, retried, then
 * dead-lettered (alarmed).
 */
export const handler = async (
  event: SQSEvent,
  context: Context,
): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];
  const hasTime = () => context.getRemainingTimeInMillis() > SAFETY_MS;

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body) as DeleteAccountMessage;
      const outcome = await runDeleteAccountStep(message, hasTime);

      if (outcome === 'continue') {
        await queue(message);
      } else if (outcome === 'done') {
        const next = NEXT_STEP[message.step];
        if (next) {
          await queue(
            { step: next.step, userId: message.userId },
            next.delaySeconds,
          );
        }
      }
      console.log(
        `[DELETE ACCOUNT] ${message.step}: ${outcome} | User: ${message.userId}`,
      );
    } catch (error) {
      console.error(`[DELETE ACCOUNT] failed for ${record.messageId}`, error);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
