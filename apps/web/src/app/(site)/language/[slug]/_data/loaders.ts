import 'server-only';

import { landingFilter } from '@tvseri.es/constants';
import type { RomanizedTitles } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import {
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';

import {
  discoverQueryString,
  getDiscoverShows,
} from '../../../_discover/data/discover';
import { discoverRowSource } from '../../../_discover/data/rowSources';
import type { RowLoader } from '../../../_discover/landing/planRow';
import { type TitleCard, toTitleCard } from './language';

/** Start here is the five most-rated, one poster row */
const START_SIZE = 5;
/** The title wall's eight cards (two rows of four) */
const WALL_SIZE = 8;

/** The language's shows, most-rated first (Start here, then the wall) */
export const languageQuery = (code: string): string =>
  discoverQueryString({
    ...landingFilter('language', code),
    sort_by: 'vote_count.desc',
  });

/**
 * Romanised titles by id (`GET /series/romanized-titles`, 1 to 50 sorted
 * ids, cached `long` like the API); null = Latin already or unknown.
 */
async function getRomanizedTitles(
  ids: string,
): Promise<RomanizedTitles | Unavailable> {
  'use cache';
  cacheTag('romanized-titles');
  const titles = await tryApi(() =>
    apiFetch<RomanizedTitles>('/series/romanized-titles', { query: { ids } }),
  );
  if (isUnavailable(titles)) {
    cacheLife('unavailable');
    return titles;
  }
  cacheLife('long');
  return titles;
}

/**
 * "More in Japanese" (the title wall): the next eight most-rated
 * after Start here, so it never repeats the row above, each in every
 * script (cached `medium`, like discover). `Unavailable` (cached for
 * seconds) when the API can't answer.
 */
export async function getTitleWall(
  code: string,
): Promise<ReadonlyArray<TitleCard> | Unavailable> {
  'use cache';
  cacheTag(`landing:language:${code}`);
  const discover = await getDiscoverShows(languageQuery(code));
  if (isUnavailable(discover)) {
    cacheLife('unavailable');
    return discover;
  }
  const shows = discover.items.slice(START_SIZE, START_SIZE + WALL_SIZE);
  if (shows.length === 0) {
    cacheLife('medium');
    return [];
  }
  const ids = [...shows.map((show) => show.id)].sort((a, b) => a - b);
  const romanized = await getRomanizedTitles(ids.join(','));
  if (isUnavailable(romanized)) {
    cacheLife('unavailable');
    return romanized;
  }
  cacheLife('medium');
  return shows.map((show) => toTitleCard(show, romanized[show.id]));
}

/** The page's poster rows top to bottom: Start here */
export const languageRows = (code: string): ReadonlyArray<RowLoader> => [
  () => discoverRowSource(languageQuery(code), { first: START_SIZE }),
];
