import type { ListId, ListItem, PaginationOptions } from '@tvseri.es/schemas';

import { apiFetch } from './client';

export async function getListItems(
  input: Readonly<{
    userId: string;
    listId: ListId;
    startDate?: Date;
    endDate?: Date;
    options?: PaginationOptions;
  }>,
) {
  const result = await apiFetch<
    Readonly<{
      items: ListItem[];
      nextCursor: string | null;
    }>
  >('/user/:id/list/:list', {
    notFound: 'null',
    params: {
      id: input.userId,
      list: input.listId.toLowerCase(),
    },
    query: {
      cursor: input.options?.cursor,
      end_date: input.endDate?.toISOString(),
      limit: input.options?.limit,
      sort_by: input.options?.sortBy,
      sort_direction: input.options?.sortDirection,
      start_date: input.startDate?.toISOString(),
    },
  });

  return result ?? { items: [], nextCursor: null };
}

async function addToList(
  input: Readonly<{
    userId: string;
    listId: ListId;
    item: Omit<ListItem, 'createdAt' | 'posterImage'> &
      Readonly<{
        createdAt?: number;
      }>;
    accessToken: string;
  }>,
) {
  await apiFetch('/user/:id/list/:list', {
    accessToken: input.accessToken,
    body: JSON.stringify(input.item),
    method: 'POST',
    params: {
      id: input.userId,
      list: input.listId.toLowerCase(),
    },
  });
}

export async function addToFavorites(
  input: Omit<Parameters<typeof addToList>[0], 'listId'>,
) {
  return addToList({
    accessToken: input.accessToken,
    item: input.item,
    listId: 'FAVORITES',
    userId: input.userId,
  });
}

export async function addToWatchlist(
  input: Parameters<typeof addToFavorites>[0],
) {
  return addToList({
    accessToken: input.accessToken,
    item: input.item,
    listId: 'WATCHLIST',
    userId: input.userId,
  });
}

export async function removeFromList(
  input: Readonly<{
    userId: string;
    listId: ListId;
    id: number;
    accessToken: string;
  }>,
) {
  await apiFetch('/user/:id/list/:list/:itemId', {
    accessToken: input.accessToken,
    method: 'DELETE',
    params: {
      id: input.userId,
      itemId: input.id,
      list: input.listId.toLowerCase(),
    },
  });
}

export async function removeFromFavorites(
  input: Omit<Parameters<typeof removeFromList>[0], 'listId'>,
) {
  return removeFromList({
    accessToken: input.accessToken,
    id: input.id,
    listId: 'FAVORITES',
    userId: input.userId,
  });
}

export async function removeFromWatchlist(
  input: Parameters<typeof removeFromFavorites>[0],
) {
  return removeFromList({
    accessToken: input.accessToken,
    id: input.id,
    listId: 'WATCHLIST',
    userId: input.userId,
  });
}

type ListStatus = Readonly<{
  isFavorited: boolean;
  isWatchlisted: boolean;
}>;

/**
 * Whether a series is in the user's favorites and watchlist, in one API call
 * (one DynamoDB BatchGetItem).
 */
export async function getListStatus(
  input: Readonly<{ id: number; userId: string }>,
): Promise<ListStatus> {
  const result = await apiFetch<ListStatus>('/user/:id/list-status/:seriesId', {
    notFound: 'null',
    params: {
      id: input.userId,
      seriesId: input.id,
    },
  });

  return result ?? { isFavorited: false, isWatchlisted: false };
}
