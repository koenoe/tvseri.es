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

export async function getListItemsCount(
  input: Omit<Parameters<typeof getListItems>[0], 'options'>,
) {
  const result = await apiFetch<
    Readonly<{
      count: number;
    }>
  >('/user/:id/list/:list/count', {
    notFound: 'null',
    params: {
      id: input.userId,
      list: input.listId.toLowerCase(),
    },
    query: {
      end_date: input.endDate?.toISOString(),
      start_date: input.startDate?.toISOString(),
    },
  });

  return result?.count ?? 0;
}

async function isInList(
  input: Readonly<{
    userId: string;
    listId: ListId;
    id: number;
  }>,
) {
  const result = await apiFetch<
    Readonly<{
      value: boolean;
    }>
  >('/user/:id/list/:list/:itemId', {
    notFound: 'null',
    params: {
      id: input.userId,
      itemId: input.id,
      list: input.listId.toLowerCase(),
    },
  });

  return result?.value ?? false;
}

export async function isInWatchlist(
  input: Omit<Parameters<typeof isInList>[0], 'listId'>,
) {
  return isInList({
    id: input.id,
    listId: 'WATCHLIST',
    userId: input.userId,
  });
}

export async function isInFavorites(
  input: Parameters<typeof isInWatchlist>[0],
) {
  return isInList({
    id: input.id,
    listId: 'FAVORITES',
    userId: input.userId,
  });
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
