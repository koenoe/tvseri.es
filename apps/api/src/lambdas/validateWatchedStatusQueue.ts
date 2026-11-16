import type { SQSBatchResponse, SQSEvent } from 'aws-lambda';

import { createChangeBudget, validateUserLists } from '@/lib/listSync';
import type { ValidateWatchedStatusMessage } from '@/lib/watchedStatus';

// Monday (UTC getDay): always count, as TMDB can backfill an older episode without changing lastEpisodeToAir
const FULL_CHECK_WEEKDAY = 1;

/**
 * The nightly list check for each queued user (`validateUserLists`). Each
 * message is handled on its own and reported back as a batch item failure if
 * it throws, so one failing user is retried (and eventually sent to the DLQ)
 * without re-running the others. One change budget per invocation caps how
 * much the run may move.
 */
export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];
  const isFullCheck = new Date().getUTCDay() === FULL_CHECK_WEEKDAY;
  const budget = createChangeBudget();

  // Sequential on purpose: each user already fans out over their series
  for (const record of event.Records) {
    try {
      const user = JSON.parse(record.body) as ValidateWatchedStatusMessage;
      await validateUserLists({ budget, isFullCheck, userId: user.id });
    } catch (error) {
      console.error(
        `Error processing validate watched status event ${record.messageId}:`,
        error,
      );
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
