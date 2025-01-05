import { randomBytes } from 'crypto';

import {
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Resource } from 'sst';

import client from '../client';

type WebhookToken = Readonly<{
  token: string;
  userId: string;
  type: string;
  createdAt: string;
}>;

const generateToken = () => {
  return randomBytes(12).toString('hex');
};

export const createWebhookToken = async (input: {
  userId: string;
  type: string;
}): Promise<WebhookToken> => {
  const token = generateToken();

  const webhookToken: WebhookToken = {
    token,
    userId: input.userId,
    type: input.type,
    createdAt: new Date().toISOString(),
  };

  const command = new PutItemCommand({
    TableName: Resource.WebhookTokens.name,
    Item: marshall({
      pk: `TOKEN#${token}`,
      gsi1pk: `USER#${input.userId}#TYPE#${input.type}`,
      ...webhookToken,
    }),
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
    TableName: Resource.WebhookTokens.name,
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :gsi1pk',
    ExpressionAttributeValues: marshall({
      ':gsi1pk': `USER#${userId}#TYPE#${type}`,
    }),
    Limit: 1,
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
    TableName: Resource.WebhookTokens.name,
    Key: marshall({
      pk: `TOKEN#${token}`,
    }),
  });

  const result = await client.send(command);

  if (!result.Item) {
    return null;
  }

  return unmarshall(result.Item) as WebhookToken;
};
