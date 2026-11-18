import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type {
  Context,
  SQSBatchResponse,
  SQSEvent,
  SQSRecord,
} from 'aws-lambda';

/** The one SQS client of every Lambda (the SDK keeps its connections alive) */
export const sqs = new SQSClient({});

/** Sends one JSON message to a queue, after `delaySeconds` when given */
export const sendMessage = (
  queueUrl: string,
  body: unknown,
  delaySeconds?: number,
) =>
  sqs.send(
    new SendMessageCommand({
      DelaySeconds: delaySeconds,
      MessageBody: JSON.stringify(body),
      QueueUrl: queueUrl,
    }),
  );

/** Stop a minute before the Lambda timeout and queue the rest */
const SAFETY_MS = 60_000;

/**
 * A queue handler for work done in resumable steps, one message per step
 * (batch size 1). `run` gets a `hasTime` check; when it answers `continue`
 * the same message is queued again and the step goes on in a new run, and
 * `next` may queue what follows. A failure is reported per message (partial
 * batch response), retried, then dead-lettered (alarmed).
 */
export const resumableStepHandler =
  <Message, Outcome extends string>({
    label,
    next,
    queueUrl,
    run,
    summary,
  }: Readonly<{
    /** The log lines' prefix, e.g. `UNDO IMPORT` */
    label: string;
    /** What to queue after a step that didn't ask to continue */
    next?: (
      message: Message,
      outcome: Outcome,
    ) => Readonly<{ message: Message; delaySeconds?: number }> | null;
    /** Read when the handler runs (an SST link) */
    queueUrl: () => string;
    run: (
      message: Message,
      hasTime: () => boolean,
    ) => Promise<Outcome | 'continue'>;
    /** The log line after a step */
    summary: (message: Message, outcome: Outcome | 'continue') => string;
  }>) =>
  async (event: SQSEvent, context: Context): Promise<SQSBatchResponse> => {
    const hasTime = () => context.getRemainingTimeInMillis() > SAFETY_MS;

    // No reserve: `run` checks `hasTime` itself and asks to continue
    return eachRecordInTime(
      event,
      context,
      0,
      async (record) => {
        const message = JSON.parse(record.body) as Message;
        const outcome = await run(message, hasTime);

        if (outcome === 'continue') {
          await sendMessage(queueUrl(), message);
        } else {
          const following = next?.(message, outcome);
          if (following) {
            await sendMessage(
              queueUrl(),
              following.message,
              following.delaySeconds,
            );
          }
        }
        console.log(`[${label}] ${summary(message, outcome)}`);
      },
      label,
    );
  };

/**
 * Handles a batch's messages one after another, each reported back on its
 * own (partial batch response) when it throws. A message only starts while
 * `reserveMs` (its worst case) is left before the Lambda timeout; the rest
 * go back as failures, because a timeout would lose the partial response
 * and redeliver the whole batch.
 */
export const eachRecordInTime = async (
  event: SQSEvent,
  context: Context,
  reserveMs: number,
  handle: (record: SQSRecord) => Promise<void>,
  label: string,
): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  for (const record of event.Records) {
    if (context.getRemainingTimeInMillis() < reserveMs) {
      batchItemFailures.push({ itemIdentifier: record.messageId });
      continue;
    }
    try {
      await handle(record);
    } catch (error) {
      console.error(`[${label}] failed for ${record.messageId}`, error);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
