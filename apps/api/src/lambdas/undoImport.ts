import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { Context, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { Resource } from 'sst';

import { type UndoImportMessage, undoImport } from '@/lib/imports/undo';

const sqs = new SQSClient({});

/** Stop a minute before the Lambda timeout and queue the rest */
const SAFETY_MS = 60_000;

/**
 * Undo import. One message per undo (batch size 1). A big import that
 * doesn't fit one run continues in a new message; a failure is reported per
 * message (partial batch response), retried, then dead-lettered (alarmed).
 */
export const handler = async (
  event: SQSEvent,
  context: Context,
  _callback?: unknown,
): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];
  const hasTime = () => context.getRemainingTimeInMillis() > SAFETY_MS;

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body) as UndoImportMessage;
      const outcome = await undoImport(message, hasTime);
      if (outcome === 'continue') {
        await sqs.send(
          new SendMessageCommand({
            MessageBody: record.body,
            QueueUrl: Resource.UndoImportQueue.url,
          }),
        );
      }
      console.log(
        `[UNDO IMPORT] ${outcome} | User: ${message.userId} | Import: ${message.importId}`,
      );
    } catch (error) {
      console.error(`[UNDO IMPORT] failed for ${record.messageId}`, error);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
