import 'server-only';

import { HOME_MOMENTS_VERSION } from '@tvseri.es/constants';
import type {
  Feature,
  FeatureOfTheDay,
  NewRelease,
  NewThisWeek,
  Premiere,
  Premieres,
  ToyOfTheDay,
  TvSeries,
} from '@tvseri.es/schemas';
import {
  type FeatureKind,
  featureKindOfDay,
  isoWeekOf,
  leadFirst,
  rotationIndex,
  type ToyKind,
  toyKindOfDay,
} from '@tvseri.es/utils';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import {
  isStandIn,
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';
import { untilUtcMidnight } from '@/lib/cache/untilUtcMidnight';
import { loadTrendingShows } from '@/lib/series/trending';

import { apiDate, utcDay } from './day';
import { featureShowIds, toyShowIds } from './momentShows';
import { idsOf, withoutNeighbours } from './neighbours';
import { onDay } from './premiereDays';

/**
 * The shared half of the home page: the same for
 * everyone, prerendered into the static shell and served from the CDN; each
 * loader revalidates on its CACHE_LIFE profile. A loader never throws: a failed API read is `Unavailable` with
 * `cacheLife('unavailable')` (revalidated after 30 s): the section's failed-row
 * state is baked into the page, which regenerates on a visit 30 s on until the API
 * answers.
 *
 * Neighbours never repeat (neighbours.ts): a section asks the cached loader
 * next to it which shows it has. When that neighbour is unavailable the
 * section still renders, but is kept only for the short `unavailable` life,
 * so it is deduped again soon.
 *
 * Content of the day takes the day as an argument (`getHomeDay()`, UTC), so
 * every instance shows the same "of the day" and a new day is a new entry.
 */

const TAG = 'home';

/** The spotlight's ten: trending this week, each with a backdrop */
const SPOTLIGHT_COUNT = 10;
const ROW_LIMIT = 20;
const PICK_DECK_SIZE = 7;
/** The deck and its reserve, for a viewer who has seen some of the seven */
const PICK_POOL_SIZE = 21;

/**
 * Today (UTC, `YYYY-MM-DD`): the entry turns over at midnight
 * (`untilUtcMidnight`, the one life that isn't a CACHE_LIFE profile), so
 * Home regenerates once a day, when its copy changes.
 */
export async function getHomeDay(): Promise<string> {
  'use cache';
  const now = new Date();
  cacheLife(untilUtcMidnight(now));
  cacheTag(TAG);
  return utcDay(now);
}

const firstUnavailable = (
  ...values: ReadonlyArray<unknown>
): Unavailable | undefined => values.find(isUnavailable);

export async function getSpotlight(): Promise<
  ReadonlyArray<TvSeries> | Unavailable
> {
  'use cache';
  cacheTag(TAG);
  const items = await loadTrendingShows();
  if (isUnavailable(items)) {
    cacheLife('unavailable');
    return items;
  }
  cacheLife('short');
  return items
    .filter((item) => Boolean(item.backdropImage))
    .slice(0, SPOTLIGHT_COUNT);
}

/**
 * The spotlight's first slide colour: Home's page colour in the server HTML
 * (the slideshow follows its slides from there); none while the spotlight
 * is unavailable.
 */
export async function getSpotlightColor(): Promise<string | undefined> {
  const items = await getSpotlight();
  return isUnavailable(items) ? undefined : items[0]?.backdropColor;
}

/**
 * "Top Picks for {month}": the most popular this month, minus the spotlight.
 * Keyed by month (`YYYY-MM`), so a new month is a new list.
 */
export async function getTopPicks(
  month: string,
): Promise<ReadonlyArray<TvSeries> | Unavailable> {
  'use cache';
  cacheTag(TAG, `home:month:${month}`);
  const [items, spotlight] = await Promise.all([
    tryApi(() => apiFetch<TvSeries[]>('/collection/most-popular-this-month')),
    getSpotlight(),
  ]);
  if (isUnavailable(items)) {
    cacheLife('unavailable');
    return items;
  }
  if (isUnavailable(spotlight)) {
    cacheLife('unavailable');
  } else {
    cacheLife('medium');
  }
  return withoutNeighbours(
    items,
    [isUnavailable(spotlight) ? [] : idsOf(spotlight)],
    ROW_LIMIT,
  );
}

/**
 * "Can't decide? Let us pick": seven of the all-time top rated, a different
 * seven each day (date-pure), minus Top Picks. Roll again picks among them
 * on the client. The neighbours below give way to these seven.
 */
export async function getPickDeck(
  day: string,
): Promise<ReadonlyArray<TvSeries> | Unavailable> {
  const pool = await getPickPool(day);
  return isUnavailable(pool) ? pool : pool.slice(0, PICK_DECK_SIZE);
}

/**
 * The deck's pool: the day's seven first, then the rest of the rotation as
 * a reserve. Signed out the deck is the seven; a signed-in viewer is dealt
 * the first seven new to them (`pick/deck.ts`, on the client), so the
 * cached read stays the same for everyone.
 */
export async function getPickPool(
  day: string,
): Promise<ReadonlyArray<TvSeries> | Unavailable> {
  'use cache';
  cacheTag(TAG);
  const [pool, topPicks] = await Promise.all([
    tryApi(() => apiFetch<TvSeries[]>('/collection/top-rated')),
    getTopPicks(day.slice(0, 7)),
  ]);
  if (isUnavailable(pool)) {
    cacheLife('unavailable');
    return pool;
  }
  if (isUnavailable(topPicks)) {
    cacheLife('unavailable');
  } else {
    cacheLife('short');
  }
  const candidates = withoutNeighbours(
    pool.filter((item) => Boolean(item.posterImage)),
    [isUnavailable(topPicks) ? [] : idsOf(topPicks)],
  );
  if (candidates.length <= PICK_DECK_SIZE) {
    return candidates;
  }
  const start = rotationIndex(day, candidates.length, 'home-pick-one');
  return Array.from(
    { length: Math.min(PICK_POOL_SIZE, candidates.length) },
    (_, index) => candidates[(start + index) % candidates.length]!,
  );
}

/**
 * "Hidden gems": rated 8 or more by 50 to 1,000 voters, first aired
 * in the last ten years. A different set each ISO week (UTC),
 * never last week's; the API picks it from its cached pool and keeps it in
 * its Cache table under the week, so the URL (one CDN key) changes weekly.
 * Gives way to the deck above it and the feature below it, which change
 * daily: the entry is per day, its life `medium`.
 */
export async function getHiddenGems(
  day: string,
): Promise<ReadonlyArray<TvSeries> | Unavailable> {
  'use cache';
  cacheTag(TAG);
  const [gems, deck, feature] = await Promise.all([
    tryApi(() =>
      apiFetch<TvSeries[]>('/home/hidden-gems', {
        query: { week: isoWeekOf(day) },
      }),
    ),
    getPickDeck(day),
    getFeature(day),
  ]);
  if (isUnavailable(gems)) {
    cacheLife('unavailable');
    return gems;
  }
  if (firstUnavailable(deck, feature)) {
    cacheLife('unavailable');
  } else {
    cacheLife('medium');
  }
  return withoutNeighbours(
    gems.filter((item) => Boolean(item.posterImage)),
    [
      isUnavailable(deck) ? [] : idsOf(deck),
      isUnavailable(feature) || !feature ? [] : featureShowIds(feature.feature),
    ],
    ROW_LIMIT,
  );
}

/**
 * The API's query for a moment of `day`: the day itself, or (the dev
 * preview of a day outside the API's window, `apiDate`) today's build of the
 * kind that day plans (`?kind=`)
 */
const momentQuery = (day: string, planned: string, version: number) => {
  const date = apiDate(day);
  return date === day
    ? { date, v: version }
    : { date, kind: planned, v: version };
};

/** The Countdown counts from the page's day too */
const featureOnDay = (feature: Feature, day: string): Feature =>
  feature.kind === 'countdown'
    ? { ...feature, premieres: onDay(feature.premieres, day) }
    : feature;

/**
 * The feature of the day (the Countdown takes the slot when it's due).
 * `null`: nothing today (the API's cached 404). Asked and cached with the
 * moments' version (`HOME_MOMENTS_VERSION`), so a change in what a day draws
 * misses every older copy: the CDN's (`?v=`) and this loader's.
 */
export const getFeature = (day: string) =>
  featureOfDay(day, HOME_MOMENTS_VERSION);

async function featureOfDay(
  day: string,
  version: number,
): Promise<FeatureOfTheDay | null | Unavailable> {
  'use cache';
  cacheTag(TAG);
  const query = momentQuery(day, featureKindOfDay(day), version);
  const result = await tryApi(() =>
    apiFetch<FeatureOfTheDay>('/home/feature', { notFound: 'null', query }),
  );
  if (isUnavailable(result)) {
    cacheLife('unavailable');
    return result;
  }
  if (result && isStandIn(result, query.date)) {
    cacheLife('unavailable');
  } else {
    cacheLife('medium');
  }
  return result && { ...result, feature: featureOnDay(result.feature, day) };
}

/**
 * The toy of the day (signed in, If you liked X may take it: day.ts); asked
 * and cached with the moments' version, as the feature
 */
export const getToy = (day: string) => toyOfDay(day, HOME_MOMENTS_VERSION);

async function toyOfDay(
  day: string,
  version: number,
): Promise<ToyOfTheDay | null | Unavailable> {
  'use cache';
  cacheTag(TAG);
  const query = momentQuery(day, toyKindOfDay(day), version);
  const result = await tryApi(() =>
    apiFetch<ToyOfTheDay>('/home/toy', { notFound: 'null', query }),
  );
  if (isUnavailable(result)) {
    cacheLife('unavailable');
    return result;
  }
  if (result && isStandIn(result, query.date)) {
    cacheLife('unavailable');
  } else {
    cacheLife('medium');
  }
  return result;
}

/** What the feature slot draws on a day: a moment of the pool or the Countdown */
export type FeatureSlotKind = FeatureKind | 'countdown';

/**
 * What the day's feature slot really draws, for its placeholder: the API's
 * answer (the same cached read the section renders, so no extra request),
 * which differs from the date's plan when the planned kind had nothing (a
 * fall-through) or on a Countdown day; a null kind when the slot draws
 * nothing. When the API is unavailable, the plan (`featureKindOfDay`), the
 * best guess for when it answers.
 */
export async function getFeatureSlot(day: string): Promise<
  Readonly<{
    /** How many the feature draws where its layout follows the count (stills, Countdown chips) */
    count: number | null;
    kind: FeatureSlotKind | null;
  }>
> {
  const feature = await getFeature(day);
  if (isUnavailable(feature)) {
    return { count: null, kind: featureKindOfDay(day) };
  }
  const drawn = feature?.feature ?? null;
  return {
    count:
      drawn?.kind === 'stills'
        ? drawn.stills.length
        : drawn?.kind === 'countdown'
          ? drawn.premieres.filter(
              (premiere) => !!premiere.series.backdropImage,
            ).length
          : null,
    kind: drawn?.kind ?? null,
  };
}

/** The toy slot's kind on a day, for its placeholder: as `getFeatureSlot` */
export async function getToySlot(day: string): Promise<ToyKind | null> {
  const toy = await getToy(day);
  return isUnavailable(toy) ? toyKindOfDay(day) : (toy?.toy.kind ?? null);
}

/**
 * "New this week": what premiered (a new series or a new season) in the
 * week up to `day`, minus the spotlight's shows (as Top Picks) and the
 * feature's and the toy's (as Premieres), led by the highest-ranked show
 * left that has a backdrop (`leadFirst`). The rank stays the API's: the
 * place among the week's premieres, also when a show above it is left out.
 */
export async function getNewThisWeek(
  day: string,
): Promise<ReadonlyArray<NewRelease> | Unavailable> {
  'use cache';
  cacheTag(TAG);
  const date = apiDate(day);
  const [answer, spotlight, feature, toy] = await Promise.all([
    tryApi(() =>
      apiFetch<NewThisWeek>('/home/new-this-week', { query: { date } }),
    ),
    getSpotlight(),
    getFeature(day),
    getToy(day),
  ]);
  if (isUnavailable(answer)) {
    cacheLife('unavailable');
    return answer;
  }
  if (firstUnavailable(spotlight, feature, toy) || isStandIn(answer, date)) {
    cacheLife('unavailable');
  } else {
    cacheLife('medium');
  }
  const taken = [
    isUnavailable(spotlight) ? [] : idsOf(spotlight),
    isUnavailable(feature) || !feature ? [] : featureShowIds(feature.feature),
    isUnavailable(toy) || !toy ? [] : toyShowIds(toy.toy),
  ];
  const kept = new Set(
    idsOf(
      withoutNeighbours(
        answer.items.map((item) => item.series),
        taken,
      ),
    ),
  );
  return leadFirst(answer.items.filter((item) => kept.has(item.series.id)));
}

/**
 * Premieres (new shows and new seasons) as seen on `day`, minus the shows
 * of New this week above it and the feature and toy of the day around it.
 * Asked with the day (`?date=`): the API builds today's list either way,
 * but the day in the URL gives each day its own CDN copy, so the first
 * render of a new day never gets yesterday's list served stale.
 */
export async function getPremieres(
  day: string,
): Promise<ReadonlyArray<Premiere> | Unavailable> {
  'use cache';
  cacheTag(TAG);
  const [premieres, newThisWeek, feature, toy] = await Promise.all([
    tryApi(() =>
      apiFetch<Premieres>('/premieres', { query: { date: apiDate(day) } }),
    ),
    getNewThisWeek(day),
    getFeature(day),
    getToy(day),
  ]);
  if (isUnavailable(premieres)) {
    cacheLife('unavailable');
    return premieres;
  }
  if (
    firstUnavailable(newThisWeek, feature, toy) ||
    isStandIn(premieres, day)
  ) {
    cacheLife('unavailable');
  } else {
    cacheLife('short');
  }
  // drawn on their backdrop: one without it is left out (the API already
  // does; a cached older answer may not)
  const items = onDay(premieres.items, day).filter(
    (item) => !!item.series.backdropImage,
  );
  const taken = [
    isUnavailable(newThisWeek) ? [] : newThisWeek.map((item) => item.series.id),
    isUnavailable(feature) || !feature ? [] : featureShowIds(feature.feature),
    isUnavailable(toy) || !toy ? [] : toyShowIds(toy.toy),
  ];
  const kept = new Set(
    idsOf(
      withoutNeighbours(
        items.map((item) => item.series),
        taken,
        ROW_LIMIT,
      ),
    ),
  );
  return items.filter((item) => kept.has(item.series.id));
}
