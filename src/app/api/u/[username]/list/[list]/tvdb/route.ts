import { type NextRequest } from 'next/server';

import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { getAllListItems } from '@/lib/db/list';
import { findUser } from '@/lib/db/user';
import { fetchMediaInfoInBatch } from '@/lib/mdblist';

const lists = ['watchlist', 'favorites', 'watched', 'in_progress'] as const;

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      username: string;
      list: (typeof lists)[number];
    }>;
  },
) {
  const { list, username } = await params;

  if (!lists.includes(list)) {
    return Response.json({ error: 'Invalid list' }, { status: 400 });
  }

  const user = await findUser({ username });

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const cacheKey = `${username}:${list}:tvdb`;
  const responseHeaders = {
    'Cache-Control': 'public, max-age=21600, immutable',
  };
  const responseFromCache = await getCacheItem<number[]>(cacheKey);
  if (responseFromCache) {
    return Response.json(responseFromCache, {
      headers: responseHeaders,
    });
  }

  const items = await getAllListItems({
    userId: user.id,
    listId: list.toUpperCase(),
  });

  const ids = items.map((item) => String(item.id));
  if (ids.length === 0) {
    return Response.json([]);
  }

  const mdblistResponse = await fetchMediaInfoInBatch(ids);
  const tvdbIds = mdblistResponse
    .filter((item) => !!item.ids.tvdb)
    .map((item) => item.ids.tvdb);

  setCacheItem<number[]>(cacheKey, tvdbIds, {
    ttl: 21600,
  });

  return Response.json(tvdbIds, {
    headers: responseHeaders,
  });
}
