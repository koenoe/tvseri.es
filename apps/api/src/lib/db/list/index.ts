import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  TransactionCanceledException,
  TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type {
  LibraryIds,
  ListItem,
  PaginationOptions,
  SeriesStatus,
} from '@tvseri.es/schemas';
import { buildPosterImageUrl } from '@tvseri.es/utils';
import { Resource } from 'sst';
import { batchGet } from '../batch';
import client from '../client';
import { writeIf } from '../conditional';
import { countQuery } from '../count';
import { decodeCursor, encodeCursor } from '../cursor';
import { prefsKey, toSeriesPrefs } from '../prefs';
import { queryAll, queryPages } from '../query';
import {
  isCustomList,
  LIST_PREFIX,
  listIndexPk,
  listItemPrefix,
  listItemSk,
  parkedWatchlistSk,
  parseListItemSk,
  seriesIndexPk,
  userPk,
} from './keys';

/**
 * The key condition on `gsi2` (a list's items by the time they were added),
 * between `startDate` and `endDate` when both are given
 */
const byAddedCondition = ({
  endDate,
  listId,
  startDate,
  userId,
}: Readonly<{
  endDate?: Date;
  listId: string;
  startDate?: Date;
  userId: string;
}>) =>
  startDate && endDate
    ? {
        ExpressionAttributeValues: marshall({
          ':endDate': endDate.getTime(),
          ':pk': listIndexPk(userId, listId),
          ':startDate': startDate.getTime(),
        }),
        KeyConditionExpression:
          'gsi2pk = :pk AND gsi2sk BETWEEN :startDate AND :endDate',
      }
    : {
        ExpressionAttributeValues: marshall({
          ':pk': listIndexPk(userId, listId),
        }),
        KeyConditionExpression: 'gsi2pk = :pk',
      };

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

  const condition = byAddedCondition(input);

  const command = new QueryCommand({
    TableName: Resource.Lists.name,
    ...(sortBy === 'title'
      ? {
          ExpressionAttributeValues: marshall({
            ':pk': listIndexPk(input.userId, input.listId),
          }),
          IndexName: 'gsi1',
          KeyConditionExpression: 'gsi1pk = :pk',
        }
      : sortBy === 'position' && isCustomList(input.listId)
        ? {
            ExpressionAttributeValues: marshall({
              ':pk': listIndexPk(input.userId, input.listId),
            }),
            IndexName: 'gsi3',
            KeyConditionExpression: 'gsi3pk = :pk',
          }
        : {
            IndexName: 'gsi2',
            ...condition,
          }),
    ExclusiveStartKey: decodeCursor(input.options?.cursor),
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
    nextCursor: encodeCursor(result.LastEvaluatedKey),
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
  const condition = byAddedCondition(input);

  return countQuery({
    IndexName: 'gsi2', // A count needs no order; gsi2 also takes the date range
    TableName: Resource.Lists.name,
    ...condition,
  });
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
        cursor,
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
    listId: string; // 'WATCHED' | 'WATCHLIST' | 'FAVORITES' | 'IN_PROGRESS' | 'RESUMING_SOON' | ulid()
    id: number;
  }>,
) => {
  const command = new GetItemCommand({
    Key: marshall({
      pk: userPk(input.userId),
      sk: listItemSk(input.listId, input.id),
    }),
    TableName: Resource.Lists.name,
  });

  const result = await client.send(command);
  return !!result.Item;
};

/**
 * The list statuses plus the user's prefs for the show, in the same
 * single BatchGetItem.
 */
export const getSeriesStatus = async (
  input: Readonly<{
    userId: string;
    id: number;
  }>,
): Promise<SeriesStatus> => {
  const favoritesSk = listItemSk('FAVORITES', input.id);
  const watchlistSk = listItemSk('WATCHLIST', input.id);
  const prefs = prefsKey(input.userId, input.id);

  const items = (
    await batchGet(
      Resource.Lists.name,
      [favoritesSk, watchlistSk, prefs.sk].map((sk) =>
        marshall({ pk: userPk(input.userId), sk }),
      ),
    )
  ).map((item) => unmarshall(item));
  const bySk = new Map(items.map((item) => [item.sk as string, item]));

  return {
    isFavorited: bySk.has(favoritesSk),
    isWatchlisted: bySk.has(watchlistSk),
    prefs: toSeriesPrefs(bySk.get(prefs.sk)),
  };
};

type AddToListInput = Readonly<{
  userId: string;
  listId: string; // 'WATCHED' | 'WATCHLIST' | 'FAVORITES' | 'IN_PROGRESS' | 'RESUMING_SOON' | ulid()
  item: Omit<ListItem, 'createdAt' | 'posterImage'> &
    Readonly<{
      createdAt?: number;
    }>;
}>;

/** A list item as stored, with its table and index keys */
const toListItemRecord = (input: AddToListInput) => {
  const createdAt = input.item.createdAt || Date.now();
  return marshall({
    createdAt,
    gsi1pk: listIndexPk(input.userId, input.listId),
    gsi1sk: input.item.title.toLowerCase(),
    gsi2pk: listIndexPk(input.userId, input.listId),
    gsi2sk: createdAt,
    gsi4pk: seriesIndexPk(input.item.id),
    id: input.item.id,
    pk: userPk(input.userId),
    posterPath: input.item.posterPath,
    sk: listItemSk(input.listId, input.item.id),
    slug: input.item.slug,
    status: input.item.status,
    title: input.item.title,
    ...(isCustomList(input.listId) &&
      input.item.position && {
        gsi3pk: listIndexPk(input.userId, input.listId),
        gsi3sk: input.item.position,
        position: input.item.position,
      }),
  });
};

export const addToList = async (input: AddToListInput) => {
  await client.send(
    new PutItemCommand({
      Item: toListItemRecord(input),
      TableName: Resource.Lists.name,
    }),
  );
};

export const removeFromList = async (
  input: Readonly<{
    userId: string;
    listId: string; // 'WATCHED' | 'WATCHLIST' | 'FAVORITES' | 'IN_PROGRESS' | 'RESUMING_SOON' | ulid()
    id: number;
  }>,
) => {
  const command = new DeleteItemCommand({
    Key: marshall({
      pk: userPk(input.userId),
      sk: listItemSk(input.listId, input.id),
    }),
    TableName: Resource.Lists.name,
  });

  await client.send(command);
};

/**
 * A list item as a read found it: absent (`null`), or present with its
 * `createdAt` (the stream re-puts an item with a new one on every sync).
 */
export type ReadEntry = Readonly<{ createdAt: number | undefined }> | null;

const unchangedSince = (read: ReadEntry) =>
  read === null
    ? { ConditionExpression: 'attribute_not_exists(pk)' }
    : read.createdAt === undefined
      ? {
          ConditionExpression:
            'attribute_exists(pk) AND attribute_not_exists(createdAt)',
        }
      : {
          ConditionExpression: 'createdAt = :createdAt',
          ExpressionAttributeValues: marshall({ ':createdAt': read.createdAt }),
        };

/**
 * Moves a show between lists in one transaction, only if every list item it
 * touches is still as `read` found it: a put over an item (or its absence),
 * deletes of items (an item read as absent is checked still absent) and
 * items only checked (`keep`), each conditional; `alsoRemove` lists are
 * deleted unconditionally with them. For writers that decided from an
 * earlier read (the nightly job, the mark request): when the watched stream
 * changed the lists meanwhile (a mark at the same moment), nothing is
 * written and it answers false.
 */
export const moveListItems = async (
  input: Readonly<{
    userId: string;
    id: number;
    put?: AddToListInput['item'] &
      Readonly<{ listId: string; read: ReadEntry }>;
    remove: ReadonlyArray<Readonly<{ listId: string; read: ReadEntry }>>;
    /** Items only checked: still as read, left as they are */
    keep?: ReadonlyArray<Readonly<{ listId: string; read: ReadEntry }>>;
    alsoRemove?: ReadonlyArray<string>;
  }>,
): Promise<boolean> => {
  const TableName = Resource.Lists.name;
  const keyOf = (listId: string) =>
    marshall({
      pk: userPk(input.userId),
      sk: listItemSk(listId, input.id),
    });
  const put = input.put;
  try {
    await client.send(
      new TransactWriteItemsCommand({
        TransactItems: [
          ...(put
            ? [
                {
                  Put: {
                    ...unchangedSince(put.read),
                    Item: toListItemRecord({
                      item: put,
                      listId: put.listId,
                      userId: input.userId,
                    }),
                    TableName,
                  },
                },
              ]
            : []),
          // An item read as absent is only checked: still absent
          ...input.remove.map(({ listId, read }) =>
            read === null
              ? {
                  ConditionCheck: {
                    ...unchangedSince(read),
                    Key: keyOf(listId),
                    TableName,
                  },
                }
              : {
                  Delete: {
                    ...unchangedSince(read),
                    Key: keyOf(listId),
                    TableName,
                  },
                },
          ),
          ...(input.keep ?? []).map(({ listId, read }) => ({
            ConditionCheck: {
              ...unchangedSince(read),
              Key: keyOf(listId),
              TableName,
            },
          })),
          ...(input.alsoRemove ?? []).map((listId) => ({
            Delete: { Key: keyOf(listId), TableName },
          })),
        ],
      }),
    );
    return true;
  } catch (error) {
    if (error instanceof TransactionCanceledException) {
      return false;
    }
    throw error;
  }
};

/**
 * A watchlist entry the watched stream took off the watchlist because the
 * show got watched episodes. It sits next to the list items in the user's
 * Lists partition as `sk PARKED#WATCHLIST#<seriesId>`, with the original
 * item (keys included) kept whole in the `item` map. It carries no top-level
 * GSI keys, so no list index sees it, and its prefix is outside `LIST#` and
 * `PREF#`, so no list, prefs or export Query reads it. Delete account removes
 * it with the rest of the partition.
 */
const parkedWatchlistKey = (userId: string, id: number) => ({
  pk: userPk(userId),
  sk: parkedWatchlistSk(id),
});

const watchlistKey = (userId: string, id: number) => ({
  pk: userPk(userId),
  sk: listItemSk('WATCHLIST', id),
});

/**
 * Takes a show off the watchlist because it is now being watched, and parks
 * the entry so that an unmark or Undo import that leaves nothing watched can
 * put it back exactly (`restoreParkedWatchlistItem`). Safe to run again: the
 * parked copy is written before the entry is deleted, and an existing parked
 * copy (the original, from before the first watched episode) is kept.
 */
export const parkWatchlistItem = async (
  input: Readonly<{ userId: string; id: number }>,
) => {
  const key = watchlistKey(input.userId, input.id);
  const { Item } = await client.send(
    new GetItemCommand({
      ConsistentRead: true,
      Key: marshall(key),
      TableName: Resource.Lists.name,
    }),
  );
  if (!Item) {
    return;
  }

  await writeIf(
    new PutItemCommand({
      ConditionExpression: 'attribute_not_exists(pk)',
      Item: {
        ...marshall({
          ...parkedWatchlistKey(input.userId, input.id),
          parkedAt: Date.now(),
        }),
        item: { M: Item },
      },
      TableName: Resource.Lists.name,
    }),
  );

  await client.send(
    new DeleteItemCommand({
      Key: marshall(key),
      TableName: Resource.Lists.name,
    }),
  );
};

/**
 * Puts a parked watchlist entry back as it was (same `createdAt`, so the same
 * place in the list), unless the show is on the watchlist again already
 * (added by hand since: that newer entry stays). Safe to run again: the entry
 * is written before the parked copy is deleted. No parked copy (shows that
 * were never on the watchlist, data from before parking existed): no change.
 */
export const restoreParkedWatchlistItem = async (
  input: Readonly<{ userId: string; id: number }>,
) => {
  const parkedKey = marshall(parkedWatchlistKey(input.userId, input.id));
  const { Item } = await client.send(
    new GetItemCommand({
      ConsistentRead: true,
      Key: parkedKey,
      TableName: Resource.Lists.name,
    }),
  );
  const original = Item?.item?.M;
  if (!Item) {
    return;
  }

  // Only an intact copy of this show's watchlist item goes back
  const watchlist = watchlistKey(input.userId, input.id);
  if (original?.pk?.S === watchlist.pk && original.sk?.S === watchlist.sk) {
    await writeIf(
      new PutItemCommand({
        ConditionExpression: 'attribute_not_exists(pk)',
        Item: original,
        TableName: Resource.Lists.name,
      }),
    );
  }

  await client.send(
    new DeleteItemCommand({ Key: parkedKey, TableName: Resource.Lists.name }),
  );
};

/**
 * Forgets a parked watchlist entry: the user took the show off their
 * watchlist themselves, so nothing should bring it back.
 */
export const forgetParkedWatchlistItem = async (
  input: Readonly<{ userId: string; id: number }>,
) => {
  await client.send(
    new DeleteItemCommand({
      Key: marshall(parkedWatchlistKey(input.userId, input.id)),
      TableName: Resource.Lists.name,
    }),
  );
};

const LIBRARY_LISTS = {
  FAVORITES: 'favorites',
  IN_PROGRESS: 'inProgress',
  WATCHED: 'watched',
  WATCHLIST: 'watchlist',
} as const satisfies Record<string, keyof LibraryIds>;

/** The four lists (not `started`, which comes from the summaries) */
type LibraryList = (typeof LIBRARY_LISTS)[keyof typeof LIBRARY_LISTS];

/**
 * Every show id in the user's lists, per list: one base-table Query of the
 * user's partition (`begins_with(sk, 'LIST#')` keeps prefs out), keys only.
 * Custom lists and RESUMING_SOON (a subset of WATCHED) are left out.
 */
export const getLibraryIds = async (userId: string): Promise<LibraryIds> => {
  const ids: Record<LibraryList, number[]> = {
    favorites: [],
    inProgress: [],
    watched: [],
    watchlist: [],
  };
  for await (const page of queryPages({
    ExpressionAttributeValues: marshall({
      ':pk': userPk(userId),
      ':prefix': LIST_PREFIX,
    }),
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    ProjectionExpression: 'sk',
    TableName: Resource.Lists.name,
  })) {
    for (const item of page.Items ?? []) {
      const parsed = parseListItemSk(item.sk?.S ?? '');
      const list = parsed
        ? LIBRARY_LISTS[parsed.listId as keyof typeof LIBRARY_LISTS]
        : undefined;
      if (list) {
        ids[list].push(parsed!.id);
      }
    }
  }

  for (const list of Object.values(ids)) {
    list.sort((a, b) => a - b);
  }
  return ids;
};

/**
 * The user's In progress, Finished and watchlist entries with their
 * `createdAt`: one base-table Query of the user's list items (two
 * attributes), for writers that move shows only if nothing changed since.
 */
export const getListPlacements = async (userId: string) => {
  const placements = {
    IN_PROGRESS: new Map<number, number | undefined>(),
    WATCHED: new Map<number, number | undefined>(),
    WATCHLIST: new Map<number, number | undefined>(),
  };
  const items = await queryAll<Readonly<{ sk: string; createdAt?: number }>>({
    ExpressionAttributeNames: { '#createdAt': 'createdAt', '#sk': 'sk' },
    ExpressionAttributeValues: marshall({
      ':pk': userPk(userId),
      ':prefix': LIST_PREFIX,
    }),
    KeyConditionExpression: 'pk = :pk AND begins_with(#sk, :prefix)',
    ProjectionExpression: '#sk, #createdAt',
    TableName: Resource.Lists.name,
  });
  for (const item of items) {
    const parsed = parseListItemSk(item.sk);
    const list = parsed?.listId;
    if (list === 'IN_PROGRESS' || list === 'WATCHED' || list === 'WATCHLIST') {
      placements[list].set(parsed!.id, item.createdAt);
    }
  }

  return placements;
};

/**
 * Whether a list has at least one item: one consistent base-table read of
 * at most one key, so an item the stream just wrote is seen.
 */
export const hasListItems = async (userId: string, listId: string) => {
  const result = await client.send(
    new QueryCommand({
      ConsistentRead: true,
      ExpressionAttributeValues: marshall({
        ':pk': userPk(userId),
        ':prefix': listItemPrefix(listId),
      }),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      Limit: 1,
      ProjectionExpression: 'pk',
      TableName: Resource.Lists.name,
    }),
  );
  return (result.Items?.length ?? 0) > 0;
};

/**
 * Which of the shows are in each of the given lists, and when each was added
 * (`createdAt`): a BatchGetItem of `ids × listIds` keys, so keep both short.
 */
export const getListEntries = async (
  userId: string,
  ids: ReadonlyArray<number>,
  listIds: ReadonlyArray<string>,
): Promise<ReadonlyMap<string, ReadonlyMap<number, number>>> => {
  const items = await batchGet(
    Resource.Lists.name,
    listIds.flatMap((listId) =>
      ids.map((id) =>
        marshall({ pk: userPk(userId), sk: listItemSk(listId, id) }),
      ),
    ),
    {
      ExpressionAttributeNames: { '#createdAt': 'createdAt', '#sk': 'sk' },
      ProjectionExpression: '#sk, #createdAt',
    },
  );

  const entries = new Map<string, Map<number, number>>(
    listIds.map((listId) => [listId, new Map()]),
  );
  for (const item of items.map((raw) => unmarshall(raw))) {
    const parsed = parseListItemSk(String(item.sk));
    if (parsed) {
      entries.get(parsed.listId)?.set(parsed.id, Number(item.createdAt ?? 0));
    }
  }
  return entries;
};
