import 'server-only';

import {
  allOf,
  excluding,
  type LandingFilter,
  landingFilter,
  themeBySlug,
} from '@tvseri.es/constants';
import { cacheLife, cacheTag } from 'next/cache';
import {
  allAvailable,
  isUnavailable,
  type Unavailable,
} from '@/lib/cache/unavailable';
import { loadSeries } from '@/lib/series/loaders';

import {
  discoverQueryString,
  getDiscoverShows,
} from '../../_discover/data/discover';
import { genreNameById } from '../../_discover/data/genreNames';
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
import type { TileShow } from '../../_discover/data/tileShow';
import type { RowLoader } from '../../_discover/landing';
import {
  pickSpotlight,
  type SpotlightKind,
  spotlightReason,
  themeSeries,
} from './themeCopy';

/** TMDB keywords of the Start here pick: an anthology, a miniseries */
const ANTHOLOGY = { with_keywords: '9706' };
const MINISERIES = { with_keywords: '11162' };
/** "Highest rated, 300+ votes" (the best row and the pick) */
const BEST_VOTES = 300;

/**
 * A theme landing's shows: any keyword of its set (and its genre, when it
 * requires one). Empty for a slug that isn't a theme landing (the page calls
 * `notFound()` before any row loads).
 */
const themeFilter = (slug: string): LandingFilter =>
  landingFilter('theme', slug) ?? {};

const bestQuery = (filter: LandingFilter) =>
  discoverQueryString({ ...filter, ...bestRated(BEST_VOTES) });

/** The theme's best ("The best dystopias"), for its look's candidates */
export const themeBestQuery = (slug: string) => bestQuery(themeFilter(slug));

export type ThemeSpotlight = Readonly<{
  kind: SpotlightKind;
  reason: string;
  show: Readonly<{
    id: number;
    slug: string;
    title: string;
    backdrop: string | null;
    /** the show's title treatment (TMDB logo, from `/series/:id`) */
    logo: string | null;
  }>;
  year: number | null;
  seasons: number | null;
  episodes: number | null;
  genre: string | null;
}>;

/**
 * The Start here tile: the theme's best-rated anthology or
 * miniseries, else its best-rated show (`pickSpotlight`), with what the
 * tile's meta line and reason need. Null when the theme has no rated show.
 * The anthology and miniseries lists take the theme's strongest keyword
 * (`allOf`: TMDB doesn't document `,` and `|` in one list); the best list
 * takes its whole set.
 */
export async function getThemeSpotlight(
  slug: string,
): Promise<ThemeSpotlight | null | Unavailable> {
  'use cache';
  cacheTag(`theme:${slug}:spotlight`);

  const filter = themeFilter(slug);
  const lists = allAvailable(
    await Promise.all([
      getDiscoverShows(bestQuery(allOf(filter, ANTHOLOGY))),
      getDiscoverShows(bestQuery(allOf(filter, MINISERIES))),
      getDiscoverShows(bestQuery(filter)),
    ]),
  );
  if (isUnavailable(lists)) {
    cacheLife('unavailable');
    return lists;
  }
  const [anthology, miniseries, best] = lists;
  const pick = pickSpotlight({
    anthology: anthology?.items ?? [],
    best: best?.items ?? [],
    miniseries: miniseries?.items ?? [],
  });
  if (!pick) {
    cacheLife('medium');
    return null;
  }
  const show: TileShow = pick.show;
  const [summaries, details] = await Promise.all([
    getShowSummaries(summaryIds([show.id])),
    // with images: the title treatment only comes with them
    loadSeries(show.id),
  ]);
  if (isUnavailable(summaries)) {
    cacheLife('unavailable');
    return summaries;
  }
  // The logo is decoration: without it the tile still draws, and the short
  // life brings it back soon (one failed read must not blank the tile)
  if (isUnavailable(details)) {
    cacheLife('unavailable');
  } else {
    cacheLife('medium');
  }
  const logo = isUnavailable(details) ? null : details?.titleTreatmentImage;
  const summary = summaries[show.id];
  const [firstGenre] = show.genreIds;
  return {
    episodes: summary?.episodes ?? null,
    genre:
      firstGenre === undefined ? null : (genreNameById(firstGenre) ?? null),
    kind: pick.kind,
    reason: spotlightReason(pick.kind, {
      episodes: summary?.episodes ?? null,
      series: themeSeries(slug, themeBySlug(slug)?.name ?? ''),
      voteAverage: show.voteAverage,
      voteCount: show.voteCount,
    }),
    seasons: summary?.seasons ?? null,
    show: {
      backdrop: show.backdrop,
      id: show.id,
      logo: logo || null,
      slug: show.slug,
      title: show.title,
    },
    year: show.year,
  };
}

/** Row indexes in `themeRows`, top to bottom */
export const THEME_ROW = { best: 2, next: 3, spotlight: 0, start: 1 } as const;

/**
 * The theme landing's rows for never-repeat, top to bottom: the Start here
 * pick (1), Where to start (its picks), the best (300+ votes), Next door (a
 * tab per `nextDoor` theme: that theme's best shows without this one, the
 * filter the API counted the tab with).
 */
export function themeRows(slug: string): ReadonlyArray<RowLoader> {
  const filter = themeFilter(slug);
  const spotlight: RowLoader = async () => {
    const found = await getThemeSpotlight(slug);
    if (isUnavailable(found)) {
      return found;
    }
    return {
      kind: 'shows',
      limit: 1,
      shows: found ? [{ ...found.show, poster: null }] : [],
      single: true,
    };
  };
  return [
    spotlight,
    // a slot whose pick the Start here tile shows takes that slot's next best
    () => whereToStartSource('theme', slug, [spotlight]),
    () => discoverRowSource(bestQuery(filter)),
    async () => {
      const facts = await landingFactsOf('theme', slug);
      if (isUnavailable(facts)) {
        return facts;
      }
      return discoverTabsSource(
        'next',
        facts.nextDoor.map((chip) => ({
          key: chip.slug,
          query: bestQuery(excluding(themeFilter(chip.slug), filter)),
        })),
      );
    },
  ];
}

/** The Next door tabs' labels, in the facts' order */
export async function themeNextTabs(
  slug: string,
): Promise<ReadonlyArray<ChipTab> | Unavailable> {
  const facts = await landingFactsOf('theme', slug);
  return isUnavailable(facts) ? facts : chipTabs(facts.nextDoor);
}
