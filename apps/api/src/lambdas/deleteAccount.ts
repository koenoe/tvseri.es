import { Resource } from 'sst';

import {
  type DeleteAccountMessage,
  NEXT_STEP,
  runDeleteAccountStep,
} from '@/lib/account/delete';
import { resumableStepHandler } from '@/lib/sqs';

/**
 * Delete account, one step per message (batch size 1). A step that
 * doesn't fit one run continues in a new message; the next step is queued
 * with a delay. Failures are reported per message, retried, then
 * dead-lettered (alarmed).
 */
export const handler = resumableStepHandler({
  label: 'DELETE ACCOUNT',
  next: (message: DeleteAccountMessage, outcome) => {
    const following = outcome === 'done' ? NEXT_STEP[message.step] : null;
    return following
      ? {
          delaySeconds: following.delaySeconds,
          message: { step: following.step, userId: message.userId },
        }
      : null;
  },
  queueUrl: () => Resource.DeleteAccountQueue.url,
  run: runDeleteAccountStep,
  summary: (message, outcome) =>
    `${message.step}: ${outcome} | User: ${message.userId}`,
});
