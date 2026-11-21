import 'server-only';

import type { TvSeries } from '@tvseri.es/schemas';
import { cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import { tags } from '@/lib/cache/tags';
import {
  cacheLifeFor,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';

/**
 * Popular this week (`GET /collection/trending`), uncached: the one fetch
 * behind each cached trending read. An outage is `Unavailable`.
 */
export const readTrendingShows = (): Promise<
  ReadonlyArray<TvSeries> | Unavailable
> => tryApi(() => apiFetch<ReadonlyArray<TvSeries>>('/collection/trending'));

/**
 * Popular this week, cached for Home's spotlight and the profile's day-one
 * blocks: on `short` (as the API keeps it), tagged `home` so an admin refresh
 * updates them; an outage is kept only for the outage life (`unavailable`).
 * Each place wraps it with its own failure handling. The 404's posters have
 * their own untagged read (`app/_not-found/trending.ts`): every page carries
 * the 404 boundary, so a `home` tag there would expire the whole site.
 */
export async function loadTrendingShows(): Promise<
  ReadonlyArray<TvSeries> | Unavailable
> {
  'use cache';
  cacheTag(tags.home);
  const shows = await readTrendingShows();
  cacheLifeFor('short', shows);
  return shows;
}
