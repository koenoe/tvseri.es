import 'server-only';

import { allOf, type LandingFilter, landingFilter } from '@tvseri.es/constants';
import { formatISO, subMonths } from 'date-fns';
import { cacheLife, cacheTag } from 'next/cache';

import { tags } from '@/lib/cache/tags';
import {
  allAvailable,
  isUnavailable,
  type Unavailable,
} from '@/lib/cache/unavailable';

import {
  type DiscoverShows,
  discoverQueryString,
  getDiscoverShows,
} from '../../_discover/data/discover';
import {
  bestRated,
  type ChipTab,
  chipTabs,
  discoverRowSource,
  discoverTabsSource,
  landingFactsOf,
  whereToStartSource,
} from '../../_discover/data/rowSources';
import { getShowSummaries, summaryIds } from '../../_discover/data/summaries';
import type { RankedShow, RowLoader } from '../../_discover/landing';
import { toRowShow } from '../../_discover/landing/types';

/** "Trending in Crime" is five shows */
const TRENDING = 5;
/** "The 50 best": highest rated with 1,000+ votes */
const BEST = 50;
const BEST_VOTES = 1000;

const isoDate = (date: Date) => formatISO(date, { representation: 'date' });

/**
 * A genre landing's shows: its TMDB genre, or the keyword of a genre TMDB
 * only has as a keyword (`with_keywords` for Horror). Empty for a slug that
 * isn't a genre landing (the page calls `notFound()` before any row loads).
 */
const genreFilter = (slug: string): LandingFilter =>
  landingFilter('genre', slug) ?? {};

/**
 * "New in crime": shows that first aired in the last 12 months. The window
 * is worked out inside the cache, so the page shell stays static and the
 * window moves on with each cache period.
 */
async function getNewInGenre(
  slug: string,
): Promise<DiscoverShows | Unavailable> {
  'use cache';
  cacheTag(tags.genreNew(slug));

  const today = new Date();
  const shows = await getDiscoverShows(
    discoverQueryString({
      ...genreFilter(slug),
      'first_air_date.gte': isoDate(subMonths(today, 12)),
      'first_air_date.lte': isoDate(today),
    }),
  );
  if (isUnavailable(shows)) {
    cacheLife('unavailable');
    return shows;
  }
  cacheLife('medium');
  return shows;
}

/** "The 50 best": TMDB rating with 1,000+ votes (its first page also picks the landing's lead show) */
export const bestInGenreQuery = (slug: string) =>
  discoverQueryString({ ...bestRated(BEST_VOTES), ...genreFilter(slug) });

/**
 * "The 50 best {genre} shows": the first 50 by TMDB rating with 1,000+
 * votes, with year and network for the list (`/series/summaries`).
 */
export async function getBestInGenre(
  slug: string,
): Promise<ReadonlyArray<RankedShow> | Unavailable> {
  'use cache';
  cacheTag(tags.genreBest(slug));

  const query = bestInGenreQuery(slug);
  const first = await getDiscoverShows(query);
  if (isUnavailable(first)) {
    cacheLife('unavailable');
    return first;
  }
  const pages = allAvailable([
    first,
    ...(await Promise.all(
      [2, 3]
        .filter((page) => page <= first.pages)
        .map((page) => getDiscoverShows(query, page)),
    )),
  ]);
  if (isUnavailable(pages)) {
    cacheLife('unavailable');
    return pages;
  }
  const seen = new Set<number>();
  const shows = pages
    .flatMap((page) => page.items)
    .filter((show) => !seen.has(show.id) && seen.add(show.id))
    .slice(0, BEST);
  const summaries =
    shows.length > 0
      ? await getShowSummaries(summaryIds(shows.map((show) => show.id)))
      : {};
  // a list without its networks would be cached for a week: pass it on
  if (isUnavailable(summaries)) {
    cacheLife('unavailable');
    return summaries;
  }
  cacheLife('medium');
  return shows.map((show) => ({
    id: show.id,
    network: summaries[show.id]?.network ?? null,
    slug: show.slug,
    title: show.title,
    year: show.year ?? summaries[show.id]?.year ?? null,
  }));
}

/** Row indexes in `genreRows`, top to bottom */
export const GENRE_ROW = { fresh: 3, kind: 2, start: 1, trending: 0 } as const;

/**
 * The genre landing's poster rows, top to bottom, for never-repeat:
 * Trending (5), Where to start (its picks), by kind (a tab per `byKind`
 * chip), New in. The ranked list is not one of them (its ranks can't skip).
 */
export function genreRows(slug: string): ReadonlyArray<RowLoader> {
  const genre = genreFilter(slug);
  const trending: RowLoader = () =>
    discoverRowSource(discoverQueryString(genre), {
      first: TRENDING,
      life: 'short',
    });
  return [
    trending,
    // a slot whose pick Trending shows takes that slot's next best
    () => whereToStartSource('genre', slug, [trending]),
    async () => {
      const facts = await landingFactsOf('genre', slug);
      if (isUnavailable(facts)) {
        return facts;
      }
      return discoverTabsSource(
        'kind',
        // the same filter the API counted the tab with (`allOf`)
        facts.byKind.map((chip) => ({
          key: chip.slug,
          query: discoverQueryString(
            allOf(genre, landingFilter('theme', chip.slug) ?? {}),
          ),
        })),
      );
    },
    async () => {
      const fresh = await getNewInGenre(slug);
      if (isUnavailable(fresh)) {
        return fresh;
      }
      return { kind: 'shows', shows: fresh.items.map(toRowShow) };
    },
  ];
}

/** The by-kind tabs' labels, in the facts' order */
export async function genreKindTabs(
  slug: string,
): Promise<ReadonlyArray<ChipTab> | Unavailable> {
  const facts = await landingFactsOf('genre', slug);
  return isUnavailable(facts) ? facts : chipTabs(facts.byKind);
}
