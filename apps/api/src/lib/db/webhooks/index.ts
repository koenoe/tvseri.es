import { randomBytes } from 'node:crypto';
import {
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { WebhookToken } from '@tvseri.es/schemas';
import { Resource } from 'sst';

import client from '../client';

const generateToken = () => {
  return randomBytes(12).toString('hex');
};

export const createWebhookToken = async (input: {
  userId: string;
  type: string;
}): Promise<WebhookToken> => {
  const token = generateToken();

  const webhookToken: WebhookToken = {
    createdAt: new Date().toISOString(),
    token,
    type: input.type,
    userId: input.userId,
  };

  const command = new PutItemCommand({
    Item: marshall({
      gsi1pk: `USER#${input.userId}#TYPE#${input.type}`,
      pk: `TOKEN#${token}`,
      ...webhookToken,
    }),
    TableName: Resource.WebhookTokens.name,
  });

  await client.send(command);
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
