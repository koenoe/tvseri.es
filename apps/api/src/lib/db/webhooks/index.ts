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
  ConditionalCheckFailedException,
  DeleteItemCommand,
  GetItemCommand,
  TransactionCanceledException,
  TransactWriteItemsCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { WEBHOOK_TOKEN_KV_PREFIX } from '@tvseri.es/constants';
import type {
  ScrobbleAccount,
  UpdateWebhookSettings,
  WebhookToken,
} from '@tvseri.es/schemas';
import { HTTPException } from 'hono/http-exception';
import { Resource } from 'sst';

import client from '../client';
import { queryAll } from '../query';

const kvs = new CloudFrontKeyValueStoreClient({});

/** 12 random bytes, hex: matches WEBHOOK_TOKEN_PATTERN_SOURCE */
const generateToken = () => randomBytes(12).toString('hex');

const toKvKey = (token: string) => `${WEBHOOK_TOKEN_KV_PREFIX}${token}`;

/**
 * The edge store's id (the last part of its ARN). A replaced store has a new
 * id, so a row marked for another store gets its key again.
 */
const edgeStoreId = () => Resource.WebhookTokensKvs.arn.split('/').pop() ?? '';

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
 * Creates the user's token for a provider, replacing (revoking) every one
 * they had. DynamoDB is the source of truth (the scrobble route reads the
 * user id from it); the edge store is only a filter in front of it. The edge
 * store is written first, in one update that also removes the old tokens, so
 * a failure there changes nothing. If the DynamoDB transaction then fails,
 * the old tokens are already revoked and the new key is an orphan nobody
 * knows (the route 401s it); generating again fixes both.
 *
 * The transaction deletes each old row only if it still exists: a create
 * that overlaps another (two tabs) and finds its old row gone answers 409
 * instead of adding a second row, and takes its new edge key back.
 */
export const generateWebhookToken = async (input: {
  userId: string;
  type: string;
}): Promise<WebhookToken> => {
  const previousRows = await findAllWebhookTokensByUserAndType(input);
  // A new URL keeps the settings (pause, whose plays count) of the newest
  const previous = [...previousRows].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )[0];
  const webhookToken: WebhookToken = {
    createdAt: new Date().toISOString(),
    // The key below is written before the row
    edgeAt: Date.now(),
    edgeStore: edgeStoreId(),
    token: generateToken(),
    type: input.type,
    userId: input.userId,
    ...(previous?.paused !== undefined && { paused: previous.paused }),
    ...(previous?.onlyAccount && { onlyAccount: previous.onlyAccount }),
  };
  const newKey = toKvKey(webhookToken.token);

  await updateEdgeTokens({
    // Deleting a key that isn't there (e.g. a token from before the edge
    // check) is fine for UpdateKeys
    Deletes:
      previousRows.length > 0
        ? previousRows.map(({ token }) => ({ Key: toKvKey(token) }))
        : undefined,
    Puts: [{ Key: newKey, Value: input.type }],
  });

  // The new row and the old rows' removal in one transaction, so a user
  // never ends up with two tokens (or none) for a provider
  const TableName = Resource.WebhookTokens.name;
  try {
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
          ...previousRows.map(({ token }) => ({
            Delete: {
              ConditionExpression: 'attribute_exists(pk) AND userId = :userId',
              ExpressionAttributeValues: marshall({ ':userId': input.userId }),
              Key: marshall({ pk: `TOKEN#${token}` }),
              TableName,
            },
          })),
        ],
      }),
    );
  } catch (error) {
    if (!(error instanceof TransactionCanceledException)) {
      throw error;
    }
    // Another create replaced the old row first: this one adds nothing
    await updateEdgeTokens({ Deletes: [{ Key: newKey }] }).catch(
      (cleanupError: unknown) => {
        console.error(
          '[ERROR] Failed to remove an unused edge key',
          cleanupError,
        );
      },
    );
    throw new HTTPException(409, {
      message: 'The URL changed meanwhile, please try again',
    });
  }

  return webhookToken;
};

/**
 * Every token row of the user for a provider: normally one, more only from
 * overlapping creates before generate refused them. gsi1 has no sort key,
 * so a single read could return any of them.
 */
const findAllWebhookTokensByUserAndType = async ({
  userId,
  type,
}: Readonly<{ userId: string; type: string }>): Promise<WebhookToken[]> => {
  const rows = await queryAll<WebhookToken>({
    ExpressionAttributeValues: marshall({
      ':gsi1pk': `USER#${userId}#TYPE#${type}`,
    }),
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :gsi1pk',
    TableName: Resource.WebhookTokens.name,
  });
  // The index key says so; checked again before anything is deleted
  return rows.filter((row) => row.userId === userId);
};

/** The user's token row for a provider, or null */
export const findWebhookTokenByUserAndType = async (
  input: Readonly<{ userId: string; type: string }>,
): Promise<WebhookToken | null> =>
  (await findAllWebhookTokensByUserAndType(input))[0] ?? null;

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

/**
 * Pause and "whose plays count". `onlyAccountId` must be the last
 * scrobble's account (the only one the user can see), or null for everyone.
 * Returns the updated token, or null when the user has no token.
 */
export const updateWebhookSettings = async (
  input: Readonly<{ userId: string; type: string }> & UpdateWebhookSettings,
): Promise<WebhookToken | null> => {
  const current = await findWebhookTokenByUserAndType(input);
  if (!current) {
    return null;
  }

  const set: string[] = [];
  const remove: string[] = [];
  const values: Record<string, unknown> = { ':userId': input.userId };

  if (input.paused !== undefined) {
    set.push('paused = :paused');
    values[':paused'] = input.paused;
  }
  if (input.onlyAccountId === null) {
    remove.push('onlyAccount');
  } else if (input.onlyAccountId !== undefined) {
    if (current.lastAccount?.id !== input.onlyAccountId) {
      throw new Error('UnknownAccount');
    }
    set.push('onlyAccount = :onlyAccount');
    values[':onlyAccount'] = current.lastAccount;
  }

  const result = await client.send(
    new UpdateItemCommand({
      // Never another user's row, never a row that was just replaced
      ConditionExpression: 'attribute_exists(pk) AND userId = :userId',
      ExpressionAttributeValues: marshall(values),
      Key: marshall({ pk: `TOKEN#${current.token}` }),
      ReturnValues: 'ALL_NEW',
      TableName: Resource.WebhookTokens.name,
      UpdateExpression: [
        set.length > 0 ? `SET ${set.join(', ')}` : '',
        remove.length > 0 ? `REMOVE ${remove.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' '),
    }),
  );

  return unmarshall(result.Attributes!) as WebhookToken;
};

/** Notes a received scrobble on the token row (status, last account) */
export const recordScrobbleReceived = async (
  token: string,
  account: ScrobbleAccount | undefined,
) => {
  try {
    await client.send(
      new UpdateItemCommand({
        ConditionExpression: 'attribute_exists(pk)',
        ExpressionAttributeValues: marshall({
          ':now': Date.now(),
          ...(account && { ':account': account }),
        }),
        Key: marshall({ pk: `TOKEN#${token}` }),
        TableName: Resource.WebhookTokens.name,
        UpdateExpression: account
          ? 'SET lastReceivedAt = :now, lastAccount = :account'
          : 'SET lastReceivedAt = :now',
      }),
    );
  } catch (error) {
    // Disconnected meanwhile: nothing to note
    if (!(error instanceof ConditionalCheckFailedException)) {
      throw error;
    }
  }
};

/**
 * Disconnect and account deletion: every token row of the user for the
 * provider. The edge keys first, in one update (scrobbles stop at the edge),
 * then each row, only if it's still this user's. Safe to repeat; a user
 * without a token is a no-op.
 */
export const deleteWebhookToken = async (
  input: Readonly<{ userId: string; type: string }>,
) => {
  const rows = await findAllWebhookTokensByUserAndType(input);
  if (rows.length === 0) {
    return;
  }

  await updateEdgeTokens({
    Deletes: rows.map(({ token }) => ({ Key: toKvKey(token) })),
  });

  for (const { token } of rows) {
    try {
      await client.send(
        new DeleteItemCommand({
          ConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: marshall({ ':userId': input.userId }),
          Key: marshall({ pk: `TOKEN#${token}` }),
          TableName: Resource.WebhookTokens.name,
        }),
      );
    } catch (error) {
      if (!(error instanceof ConditionalCheckFailedException)) {
        throw error;
      }
    }
  }
};

/** Whether the row's key was written to the edge store in use now */
const isEdgeKeyMarked = (webhookToken: WebhookToken) =>
  webhookToken.edgeAt !== undefined && webhookToken.edgeStore === edgeStoreId();

/**
 * Writes the key of a row that isn't marked for the current edge store: a
 * token from before the edge check (no mark), or one whose store was replaced
 * since. One idempotent put, then the row is marked, so it happens once.
 * Returns whether the URL passes the edge: false only when the key couldn't
 * be written.
 */
export const ensureEdgeKey = async (
  webhookToken: WebhookToken,
): Promise<boolean> => {
  if (isEdgeKeyMarked(webhookToken)) {
    return true;
  }
  try {
    await updateEdgeTokens({
      Puts: [{ Key: toKvKey(webhookToken.token), Value: webhookToken.type }],
    });
    await client.send(
      new UpdateItemCommand({
        // A row removed meanwhile (disconnect, new URL) stays removed
        ConditionExpression: 'attribute_exists(pk)',
        ExpressionAttributeValues: marshall({
          ':at': Date.now(),
          ':store': edgeStoreId(),
        }),
        Key: marshall({ pk: `TOKEN#${webhookToken.token}` }),
        TableName: Resource.WebhookTokens.name,
        UpdateExpression: 'SET edgeAt = :at, edgeStore = :store',
      }),
    );
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return true;
    }
    console.error('[WEBHOOK EDGE] could not write a missing key:', error);
    return false;
  }
};
