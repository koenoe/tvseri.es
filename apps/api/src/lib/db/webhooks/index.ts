import { randomBytes } from 'node:crypto';
// Registers the SigV4a signer the KeyValueStore API requires
import '@aws-sdk/signature-v4a';
import {
  CloudFrontKeyValueStoreClient,
  DescribeKeyValueStoreCommand,
  UpdateKeysCommand,
  type UpdateKeysCommandInput,
} from '@aws-sdk/client-cloudfront-keyvaluestore';
import {
  GetItemCommand,
  QueryCommand,
  TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { WEBHOOK_TOKEN_KV_PREFIX } from '@tvseri.es/constants';
import type { WebhookToken } from '@tvseri.es/schemas';
import { Resource } from 'sst';

import client from '../client';

const kvs = new CloudFrontKeyValueStoreClient({});

/** 12 random bytes, hex: matches WEBHOOK_TOKEN_PATTERN_SOURCE */
const generateToken = () => randomBytes(12).toString('hex');

const toKvKey = (token: string) => `${WEBHOOK_TOKEN_KV_PREFIX}${token}`;

/**
 * Writes token keys to the API Router's KeyValueStore, which the edge function
 * checks webhook calls against. Every write needs the store's current ETag;
 * when another write (e.g. an SST deploy) got in between, it's re-read and
 * retried once.
 */
const updateEdgeTokens = async (
  changes: Pick<UpdateKeysCommandInput, 'Deletes' | 'Puts'>,
  attempt = 0,
): Promise<void> => {
  const KvsARN = Resource.WebhookTokensKvs.arn;
  const { ETag } = await kvs.send(new DescribeKeyValueStoreCommand({ KvsARN }));

  try {
    await kvs.send(
      new UpdateKeysCommand({ ...changes, IfMatch: ETag, KvsARN }),
    );
  } catch (error) {
    const isStaleEtag =
      error instanceof Error &&
      (error.name === 'ConflictException' ||
        error.name === 'ValidationException');
    if (isStaleEtag && attempt === 0) {
      return updateEdgeTokens(changes, 1);
    }
    throw error;
  }
};

/**
 * Creates the user's token for a provider, replacing (revoking) the one they
 * had. DynamoDB is the source of truth (the scrobble route reads the user id
 * from it); the edge store is only a filter in front of it. The edge store is
 * written first, in one update that also removes the old token, so a failure
 * there changes nothing. If the DynamoDB transaction then fails, the old token
 * is already revoked and the new key is an orphan nobody knows (the route 401s
 * it); generating again fixes both.
 */
export const generateWebhookToken = async (input: {
  userId: string;
  type: string;
}): Promise<WebhookToken> => {
  const previous = await findWebhookTokenByUserAndType(input);
  const webhookToken: WebhookToken = {
    createdAt: new Date().toISOString(),
    token: generateToken(),
    type: input.type,
    userId: input.userId,
  };

  await updateEdgeTokens({
    // Deleting a key that isn't there (e.g. a token from before the edge
    // check) is fine for UpdateKeys
    Deletes: previous ? [{ Key: toKvKey(previous.token) }] : undefined,
    Puts: [{ Key: toKvKey(webhookToken.token), Value: input.type }],
  });

  // The new row and the old row's removal in one transaction, so a user
  // never ends up with two tokens (or none) for a provider
  const TableName = Resource.WebhookTokens.name;
  await client.send(
    new TransactWriteItemsCommand({
      TransactItems: [
        {
          Put: {
            Item: marshall({
              gsi1pk: `USER#${input.userId}#TYPE#${input.type}`,
              pk: `TOKEN#${webhookToken.token}`,
              ...webhookToken,
            }),
            TableName,
          },
        },
        ...(previous
          ? [
              {
                Delete: {
                  Key: marshall({ pk: `TOKEN#${previous.token}` }),
                  TableName,
                },
              },
            ]
          : []),
      ],
    }),
  );

  return webhookToken;
};

export const findWebhookTokenByUserAndType = async ({
  userId,
  type,
}: {
  userId: string;
  type: string;
}): Promise<WebhookToken | null> => {
  const command = new QueryCommand({
    ExpressionAttributeValues: marshall({
      ':gsi1pk': `USER#${userId}#TYPE#${type}`,
    }),
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :gsi1pk',
    Limit: 1,
    TableName: Resource.WebhookTokens.name,
  });

  const result = await client.send(command);

  if (!result.Items?.[0]) {
    return null;
  }

  return unmarshall(result.Items[0]) as WebhookToken;
};

export const findWebhookToken = async (
  token: string,
): Promise<WebhookToken | null> => {
  const command = new GetItemCommand({
    Key: marshall({
      pk: `TOKEN#${token}`,
    }),
    TableName: Resource.WebhookTokens.name,
  });

  const result = await client.send(command);

  if (!result.Item) {
    return null;
  }

  return unmarshall(result.Item) as WebhookToken;
};
