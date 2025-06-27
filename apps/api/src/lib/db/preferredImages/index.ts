import { GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { PreferredImages } from '@tvseri.es/types';
import { Resource } from 'sst';

import client from '../client';

export const findPreferredImages = async (
  id: number,
): Promise<PreferredImages | null> => {
  const command = new GetItemCommand({
    Key: marshall({
      pk: `SERIES#${id}`,
    }),
    TableName: Resource.PreferredImages.name,
  });

  try {
    const result = await client.send(command);

    if (!result.Item) {
      return null;
    }

    return unmarshall(result.Item) as PreferredImages;
  } catch (_error) {
    throw new Error('Failed to find preferred images');
  }
};

export const putPreferredImages = async (
  id: number | string,
  preferred: PreferredImages,
): Promise<void> => {
  const command = new PutItemCommand({
    Item: marshall({
      pk: `SERIES#${id}`,
      updatedAt: Date.now(),
      ...preferred,
    }),
    TableName: Resource.PreferredImages.name,
  });

  try {
    await client.send(command);
  } catch (_error) {
    throw new Error('Failed to update preferred images');
  }
};
