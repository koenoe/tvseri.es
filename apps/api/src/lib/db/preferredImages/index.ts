import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { PreferredImages } from '@tvseri.es/schemas';
import { UNKNOWN_COLOR } from '@tvseri.es/utils';
import { Resource } from 'sst';

import { groundColorOr } from '../../groundColor';
import { batchGet } from '../batch';
import client from '../client';

/** A pick's colour when it isn't a six-digit hex: the API's unknown colour */

/**
 * A saved pick as served: its colour through the page colour rule
 * (`groundColor`). Picks saved before the rule keep their stored colour;
 * only what is read is corrected, nothing is rewritten.
 */
const served = (item: Record<string, unknown>): PreferredImages => {
  const preferredImages = item as PreferredImages;
  return {
    ...preferredImages,
    backdropColor: groundColorOr(preferredImages.backdropColor, UNKNOWN_COLOR),
  };
};

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

    return served(unmarshall(result.Item));
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
      const { pk, ...preferredImages } = unmarshall(item) as Readonly<{
        pk: string;
      }>;
      return [Number(pk.slice('SERIES#'.length)), served(preferredImages)];
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
      ...served(preferred),
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
