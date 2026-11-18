import type { Context, SQSBatchResponse, SQSEvent } from 'aws-lambda';

import { createChangeBudget, validateUserLists } from '@/lib/listSync';
import { eachRecordInTime } from '@/lib/sqs';
import type { ValidateWatchedStatusMessage } from '@/lib/watchedStatus';

// Monday (UTC getDay): always count, as TMDB can backfill an older episode without changing lastEpisodeToAir
const FULL_CHECK_WEEKDAY = 1;

// One heavy user's worst case on a Monday's full check
const USER_RESERVE_MS = 20_000;

/**
 * The nightly list check for each queued user (`validateUserLists`). Each
 * message is handled on its own, so one failing user is retried (and
 * eventually sent to the DLQ) without re-running the others. One change
 * budget per invocation caps how much the run may move. Sequential on
 * purpose: each user already fans out over their series.
 */
export const handler = (
  event: SQSEvent,
  context: Context,
): Promise<SQSBatchResponse> => {
  const isFullCheck = new Date().getUTCDay() === FULL_CHECK_WEEKDAY;
  const budget = createChangeBudget();

  return eachRecordInTime(
    event,
    context,
    USER_RESERVE_MS,
    async (record) => {
      const user = JSON.parse(record.body) as ValidateWatchedStatusMessage;
      await validateUserLists({ budget, isFullCheck, userId: user.id });
    },
    'VALIDATE WATCHED STATUS',
  );
};
