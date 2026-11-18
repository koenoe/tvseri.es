import { Resource } from 'sst';

import { sendMessage } from '@/lib/sqs';

import type { DeleteAccountMessage } from './delete';

/** Starts the delete-account steps for a user who asked for it */
export const queueAccountDeletion = async (userId: string) => {
  await sendMessage(Resource.DeleteAccountQueue.url, {
    step: 'data',
    userId,
  } satisfies DeleteAccountMessage);
};
