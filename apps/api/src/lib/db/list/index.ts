import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { ListItem, PaginationOptions } from '@tvseri.es/types';
import { Resource } from 'sst';
import { buildPosterImageUrl } from '@/lib/tmdb/helpers';
import client from '../client';

// const BATCH_SIZE = 25;

// type List = Readonly<{
//   id: string;
//   title: string;
//   description?: string;
//   createdAt: number;
// }>;

const isCustomList = (listId: string) =>
  !['WATCHED', 'WATCHLIST', 'FAVORITES', 'IN_PROGRESS'].includes(listId);

// export const createCustomList = async (
//   input: Readonly<{
//     userId: string;
//     title: string;
//     description?: string;
//   }>,
// ) => {
//   const listId = ulid();
//   const now = Date.now();

//   const command = new PutItemCommand({
//     TableName: Resource.Lists.name,
//     Item: marshall({
//       pk: `USER#${input.userId}`,
//       sk: `LIST#CUSTOM#${listId}`,
//       title: input.title,
//       description: input.description,
//       createdAt: now,
//     }),
//   });

//   await client.send(command);

//   return { listId };
// };

// export const getCustomList = async (
//   input: Readonly<{
//     userId: string;
//     listId: string;
//   }>,
// ) => {
//   const command = new GetItemCommand({
//     TableName: Resource.Lists.name,
//     Key: marshall({
//       pk: `USER#${input.userId}`,
//       sk: `LIST#CUSTOM#${input.listId}`,
//     }),
//   });

//   const result = await client.send(command);
//   return result.Item ? unmarshall(result.Item) : null;
// };

// export const getCustomLists = async (
//   input: Readonly<{
//     userId: string;
//   }>,
// ) => {
//   const command = new QueryCommand({
//     TableName: Resource.Lists.name,
//     KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
//     ExpressionAttributeValues: marshall({
//       ':pk': `USER#${input.userId}`,
//       ':prefix': 'LIST#CUSTOM#',
//     }),
//     FilterExpression: 'attribute_not_exists(id)',
//   });

//   const result = await client.send(command);
//   return result.Items?.map((item) => unmarshall(item));
// };

// export const deleteCustomList = async (
//   input: Readonly<{
//     userId: string;
//     listId: string;
//   }>,
// ) => {
//   const command = new QueryCommand({
//     TableName: Resource.Lists.name,
//     KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
//     ExpressionAttributeValues: marshall({
//       ':pk': `USER#${input.userId}`,
//       ':prefix': `LIST#CUSTOM#${input.listId}`,
//     }),
//   });

//   const result = await client.send(command);
//   if (!result.Items?.length) return;

//   const deleteRequests = result.Items.map((item) => ({
//     DeleteRequest: {
//       Key: marshall({
//         pk: item.pk,
//         sk: item.sk,
//       }),
//     },
//   }));

//   const batches = [];
//   for (let i = 0; i < deleteRequests.length; i += BATCH_SIZE) {
//     batches.push(deleteRequests.slice(i, i + BATCH_SIZE));
//   }

//   await Promise.all(
//     batches.map((batch) =>
//       client.send(
//         new BatchWriteItemCommand({
//           RequestItems: {
//             [Resource.Lists.name]: batch,
//           },
//         }),
//       ),
//     ),
//   );
// };

// export const reorderCustomList = async (
//   input: Readonly<{
//     userId: string;
//     listId: string;
//     items: Array<{
//       id: number;
//       position: number;
//     }>;
//   }>,
// ) => {
//   const updates = input.items.map((item) => ({
//     Update: {
//       TableName: Resource.Lists.name,
//       Key: marshall({
//         pk: `USER#${input.userId}`,
//         sk: `LIST#CUSTOM#${input.listId}#ITEM#${item.id}`,
//       }),
//       UpdateExpression: 'SET position = :pos, gsi3sk = :pos',
//       ExpressionAttributeValues: marshall({
//         ':pos': item.position,
//       }),
//     },
//   }));

//   const batches = [];
//   for (let i = 0; i < updates.length; i += BATCH_SIZE) {
//     batches.push(updates.slice(i, i + BATCH_SIZE));
//   }

//   await Promise.all(
//     batches.map((batch) =>
//       client.send(
//         new TransactWriteItemsCommand({
//           TransactItems: batch,
//         }),
//       ),
//     ),
//   );
// };

export const getListItems = async (
  input: Readonly<{
    userId: string;
    listId: string;
    startDate?: Date;
    endDate?: Date;
    options?: PaginationOptions;
  }>,
) => {
  const sortBy = input.options?.sortBy ?? 'createdAt';
  const sortDirection = input.options?.sortDirection ?? 'desc';
  const limit = input.options?.limit ?? 20;

  const hasDateRange = input.startDate && input.endDate;
  const condition = hasDateRange
    ? {
        ExpressionAttributeValues: marshall({
          ':endDate': input.endDate.getTime(),
          ':pk': `LIST#${input.userId}#${input.listId}`,
          ':startDate': input.startDate.getTime(),
        }),
        KeyConditionExpression:
          'gsi2pk = :pk AND gsi2sk BETWEEN :startDate AND :endDate',
      }
    : {
        ExpressionAttributeValues: marshall({
          ':pk': `LIST#${input.userId}#${input.listId}`,
        }),
        KeyConditionExpression: 'gsi2pk = :pk',
      };

  const command = new QueryCommand({
    TableName: Resource.Lists.name,
    ...(sortBy === 'title'
      ? {
          ExpressionAttributeValues: marshall({
            ':pk': `LIST#${input.userId}#${input.listId}`,
          }),
          IndexName: 'gsi1',
          KeyConditionExpression: 'gsi1pk = :pk',
        }
      : sortBy === 'position' && isCustomList(input.listId)
        ? {
            ExpressionAttributeValues: marshall({
              ':pk': `LIST#${input.userId}#${input.listId}`,
            }),
            IndexName: 'gsi3',
            KeyConditionExpression: 'gsi3pk = :pk',
          }
        : {
            IndexName: 'gsi2',
            ...condition,
          }),
    ExclusiveStartKey: input.options?.cursor
      ? JSON.parse(Buffer.from(input.options.cursor, 'base64url').toString())
      : undefined,
    Limit: limit,
    ScanIndexForward: sortDirection === 'asc',
  });

  const result = await client.send(command);

  return {
    items:
      result.Items?.map((item) => {
        const normalizedItem = unmarshall(item);
        const posterImage = normalizedItem.posterPath
          ? buildPosterImageUrl(normalizedItem.posterPath)
          : normalizedItem.posterImage;
        return {
          createdAt: normalizedItem.createdAt,
          id: normalizedItem.id,
          position: normalizedItem.position,
          posterImage,
          slug: normalizedItem.slug,
          status: normalizedItem.status,
          title: normalizedItem.title,
        } as ListItem;
      }) ?? [],
    nextCursor: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
          'base64url',
        )
      : null,
  };
};

export const getListItemsCount = async (
  input: Readonly<{
    userId: string;
    listId: string;
    startDate?: Date;
    endDate?: Date;
  }>,
) => {
  const hasDateRange = input.startDate && input.endDate;
  const condition = hasDateRange
    ? {
        ExpressionAttributeValues: marshall({
          ':endDate': input.endDate.getTime(),
          ':pk': `LIST#${input.userId}#${input.listId}`,
          ':startDate': input.startDate.getTime(),
        }),
        KeyConditionExpression:
          'gsi2pk = :pk AND gsi2sk BETWEEN :startDate AND :endDate',
      }
    : {
        ExpressionAttributeValues: marshall({
          ':pk': `LIST#${input.userId}#${input.listId}`,
        }),
        KeyConditionExpression: 'gsi2pk = :pk',
      };

  const command = new QueryCommand({
    IndexName: 'gsi2',
    TableName: Resource.Lists.name, // Always use gsi2 for count since we don't need sorting
    ...condition,
    Select: 'COUNT',
  });

  const result = await client.send(command);
  return result.Count ?? 0;
};

export const getAllListItems = async (
  input: Readonly<{
    userId: string;
    listId: string;
    startDate?: Date;
    endDate?: Date;
    sortBy?: 'createdAt' | 'title' | 'position';
    sortDirection?: 'asc' | 'desc';
  }>,
): Promise<ListItem[]> => {
  const allItems: ListItem[] = [];
  let cursor: string | null = null;

  do {
    const result = await getListItems({
      endDate: input.endDate,
      listId: input.listId,
      options: {
        cursor, // Dynamo DB limit
        limit: 1000,
        sortBy: input.sortBy,
        sortDirection: input.sortDirection,
      },
      startDate: input.startDate,
      userId: input.userId,
    });

    allItems.push(...result.items);
    cursor = result.nextCursor;
  } while (cursor !== null);

  return allItems;
};

export const isInList = async (
  input: Readonly<{
    userId: string;
    listId: string; // 'WATCHED' | 'WATCHLIST' | 'FAVORITES' | 'IN_PROGRESS' | ulid()
    id: number;
  }>,
) => {
  const listPrefix = isCustomList(input.listId)
    ? `LIST#CUSTOM#${input.listId}`
    : `LIST#${input.listId}`;

  const command = new GetItemCommand({
    Key: marshall({
      pk: `USER#${input.userId}`,
      sk: `${listPrefix}#ITEM#${input.id}`,
    }),
    TableName: Resource.Lists.name,
  });

  const result = await client.send(command);
  return !!result.Item;
};

export const addToList = async (
  input: Readonly<{
    userId: string;
    listId: string; // 'WATCHED' | 'WATCHLIST' | 'FAVORITES' | 'IN_PROGRESS' | ulid()
    item: Omit<ListItem, 'createdAt' | 'posterImage'> &
      Readonly<{
        createdAt?: number;
      }>;
  }>,
) => {
  const createdAt = input.item.createdAt || Date.now();
  const listPrefix = isCustomList(input.listId)
    ? `LIST#CUSTOM#${input.listId}`
    : `LIST#${input.listId}`;

  const command = new PutItemCommand({
    Item: marshall({
      createdAt,
      gsi1pk: `LIST#${input.userId}#${input.listId}`,
      gsi1sk: input.item.title.toLowerCase(),
      gsi2pk: `LIST#${input.userId}#${input.listId}`,
      gsi2sk: createdAt,
      gsi4pk: `SERIES#${input.item.id}`,
      id: input.item.id,
      pk: `USER#${input.userId}`,
      posterPath: input.item.posterPath,
      sk: `${listPrefix}#ITEM#${input.item.id}`,
      slug: input.item.slug,
      status: input.item.status,
      title: input.item.title,
      ...(isCustomList(input.listId) &&
        input.item.position && {
          gsi3pk: `LIST#${input.userId}#${input.listId}`,
          gsi3sk: input.item.position,
          position: input.item.position,
        }),
    }),
    TableName: Resource.Lists.name,
  });

  await client.send(command);
};

export const removeFromList = async (
  input: Readonly<{
    userId: string;
    listId: string; // 'WATCHED' | 'WATCHLIST' | 'FAVORITES' | 'IN_PROGRESS' | ulid()
    id: number;
  }>,
) => {
  const listPrefix = isCustomList(input.listId)
    ? `LIST#CUSTOM#${input.listId}`
    : `LIST#${input.listId}`;

  const command = new DeleteItemCommand({
    Key: marshall({
      pk: `USER#${input.userId}`,
      sk: `${listPrefix}#ITEM#${input.id}`,
    }),
    TableName: Resource.Lists.name,
  });

  await client.send(command);
};

export const isInWatchlist = async (
  input: Readonly<{
    userId: string;
    id: number;
  }>,
) => {
  return isInList({
    id: input.id,
    listId: 'WATCHLIST',
    userId: input.userId,
  });
};

export const isInFavorites = async (
  input: Readonly<{
    userId: string;
    id: number;
  }>,
) => {
  return isInList({
    id: input.id,
    listId: 'FAVORITES',
    userId: input.userId,
  });
};

export const addToWatchlist = async (
  input: Readonly<{
    userId: string;
    item: Omit<ListItem, 'createdAt' | 'posterImage'>;
  }>,
) => {
  return addToList({
    item: input.item,
    listId: 'WATCHLIST',
    userId: input.userId,
  });
};

export const addToFavorites = async (
  input: Readonly<{
    userId: string;
    item: Omit<ListItem, 'createdAt' | 'posterImage'>;
  }>,
) => {
  return addToList({
    item: input.item,
    listId: 'FAVORITES',
    userId: input.userId,
  });
};

export const removeFromWatchlist = async (
  input: Readonly<{
    userId: string;
    id: number;
  }>,
) => {
  return removeFromList({
    id: input.id,
    listId: 'WATCHLIST',
    userId: input.userId,
  });
};

export const removeFromFavorites = async (
  input: Readonly<{
    userId: string;
    id: number;
  }>,
) => {
  return removeFromList({
    id: input.id,
    listId: 'FAVORITES',
    userId: input.userId,
  });
};
