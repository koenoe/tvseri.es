import 'server-only';

import type { Page, WatchedItem } from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';

import {
  type ApiFollowItem,
  type DiaryItem,
  type FollowItem,
  toDiaryItem,
  toFollowItem,
} from './views';

/**
 * One page of a profile's lists, history or follows (signed-in
 * readers only, so always with the viewer's token). Shared by the
 * sub-pages' first render and the `/api/u/*` route handlers that load the
 * next pages.
 */

type Read = Readonly<{
  accessToken: string;
  cursor?: string | null;
  limit?: number;
  userId: string;
}>;

/**
 * History, newest first. With `startDate` and `endDate` (ISO, both or
 * neither: the API ignores one alone) only that range; a cursor continues
 * only under the range it came from.
 */
export async function loadHistoryPage({
  accessToken,
  cursor,
  endDate,
  limit,
  startDate,
  userId,
}: Read & Readonly<{ startDate?: string; endDate?: string }>): Promise<
  Page<DiaryItem>
> {
  const page = await apiFetch<Page<WatchedItem>>('/user/:id/watched', {
    accessToken,
    params: { id: userId },
    query: {
      cursor: cursor ?? undefined,
      end_date: endDate,
      limit,
      start_date: startDate,
    },
  });
  return { items: page.items.map(toDiaryItem), nextCursor: page.nextCursor };
}

/** `include=watching` reads two small items per row: the API takes at most 24 a page */
const WATCHING_PAGE = 24;

/**
 * A follow list's page for someone else's Circle: each person with what
 * they are watching now (`include=watching`), 24 rows a page.
 */
export async function loadFollowPage(
  type: 'followers' | 'following',
  { accessToken, cursor, userId }: Read,
): Promise<Page<FollowItem>> {
  const page = await apiFetch<Page<ApiFollowItem>>(`/user/:id/${type}`, {
    accessToken,
    params: { id: userId },
    query: {
      cursor: cursor ?? undefined,
      include: 'watching',
      limit: WATCHING_PAGE,
    },
  });
  return { items: page.items.map(toFollowItem), nextCursor: page.nextCursor };
}
