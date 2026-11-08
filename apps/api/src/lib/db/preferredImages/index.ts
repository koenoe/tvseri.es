import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { PreferredImages } from '@tvseri.es/schemas';
import { Resource } from 'sst';

import { batchGet } from '../batch';
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

/**
 * Batch version of `findPreferredImages` (one BatchGetItem per 100 ids).
 * Returns the preferred images by series id; ids without any are absent.
 */
export const findPreferredImagesForMany = async (
  ids: ReadonlyArray<number>,
): Promise<Map<number, PreferredImages>> => {
  const items = await batchGet(
    Resource.PreferredImages.name,
    ids.map((id) => marshall({ pk: `SERIES#${id}` })),
  );

  return new Map(
    items.map((item) => {
      const { pk, ...preferredImages } = unmarshall(item) as PreferredImages &
        Readonly<{ pk: string }>;
      return [Number(pk.slice('SERIES#'.length)), preferredImages];
    }),
  );
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

export const deletePreferredImages = async (
  id: number | string,
): Promise<void> => {
  const command = new DeleteItemCommand({
    Key: marshall({
      pk: `SERIES#${id}`,
    }),
    TableName: Resource.PreferredImages.name,
  });

  try {
    await client.send(command);
  } catch (_error) {
    throw new Error('Failed to delete preferred images');
  }
};
