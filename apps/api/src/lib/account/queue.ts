import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Resource } from 'sst';

import type { DeleteAccountMessage } from './delete';

const sqs = new SQSClient({});

/** Starts the delete-account steps for a user who asked for it */
export const queueAccountDeletion = async (userId: string) => {
  await sqs.send(
    new SendMessageCommand({
      MessageBody: JSON.stringify({
        step: 'data',
        userId,
      } satisfies DeleteAccountMessage),
      QueueUrl: Resource.DeleteAccountQueue.url,
    }),
  );
};
