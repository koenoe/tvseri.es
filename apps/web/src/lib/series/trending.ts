import 'server-only';

import type { TvSeries } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import {
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';

/**
 * Popular this week (`GET /collection/trending`): the one cached read behind
 * Home's spotlight, the profile's day-one blocks and the 404's posters. One
 * copy on `short` (as the API keeps it), tagged `home` so an admin refresh
 * updates every place; an outage is kept only for the outage life
 * (`unavailable`). Each place wraps it with its own failure handling.
 */
export async function loadTrendingShows(): Promise<
  ReadonlyArray<TvSeries> | Unavailable
> {
  'use cache';
  cacheTag('home');
  const shows = await tryApi(() =>
    apiFetch<ReadonlyArray<TvSeries>>('/collection/trending'),
  );
  if (isUnavailable(shows)) {
    cacheLife('unavailable');
  } else {
    cacheLife('short');
  }
  return shows;
}
