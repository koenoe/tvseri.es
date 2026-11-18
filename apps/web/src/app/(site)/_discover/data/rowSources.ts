import 'server-only';

import type { LandingType } from '@tvseri.es/constants';
import type { LandingFacts } from '@tvseri.es/schemas';

import {
  allAvailable,
  isUnavailable,
  type Unavailable,
} from '@/lib/cache/unavailable';

import type { RowLoader } from '../landing/planRow';
import { startSource } from '../landing/startSlots';
import { toRowShow } from '../landing/types';
import { getDiscoverShows } from './discover';
import { getLandingFacts } from './facts';
import { getWhereToStart, type StartFor } from './whereToStart';

type Source = Awaited<ReturnType<RowLoader>>;

/**
 * "Highest rated" on TMDB with at least `votes` votes (a discover filter):
 * each landing sets its own floor (Genre 1,000, Theme 300, Country and
 * Network 50).
 */
export const bestRated = (votes: number) =>
  ({ sort_by: 'vote_average.desc', 'vote_count.gte': String(votes) }) as const;

/**
 * A landing's poster row from one discover list (`discoverQueryString`).
 * `first`: the row is only the list's first N (Trending's five, a
 * language's Start here). `life` as `getDiscoverShows`.
 */
export async function discoverRowSource(
  query: string,
  { first, life }: Readonly<{ first?: number; life?: 'medium' | 'short' }> = {},
): Promise<Source> {
  const found = await getDiscoverShows(query, 1, life);
  if (isUnavailable(found)) {
    return found;
  }
  const shows = found.items.map(toRowShow);
  return first === undefined
    ? { kind: 'shows', shows }
    : { kind: 'shows', limit: first, shows: shows.slice(0, first) };
}

/**
 * A landing's switch row: one discover list per tab, in the tabs' order.
 * `Unavailable` when any tab's read failed (a switch never shows a tab that
 * is only empty because the API was down).
 */
export async function discoverTabsSource(
  switchId: string,
  tabs: ReadonlyArray<Readonly<{ key: string; query: string }>>,
): Promise<Source> {
  const lists = allAvailable(
    await Promise.all(tabs.map((tab) => getDiscoverShows(tab.query))),
  );
  if (isUnavailable(lists)) {
    return lists;
  }
  return {
    kind: 'tabs',
    switchId,
    tabs: Object.fromEntries(
      tabs.map((tab, index) => [
        tab.key,
        lists[index]?.items.map(toRowShow) ?? [],
      ]),
    ),
  };
}

/**
 * Where to start as a landing's row: the picks, each slot filled around
 * what the rows `above` it draw (`startSource`).
 */
export async function whereToStartSource(
  by: StartFor,
  value: string,
  above: ReadonlyArray<RowLoader> = [],
): Promise<Source> {
  const [candidates, ...shown] = await Promise.all([
    getWhereToStart(by, value),
    ...above.map((load) => load()),
  ]);
  return isUnavailable(candidates)
    ? candidates
    : startSource(candidates, shown);
}

/**
 * A kind's facts for its rows; throws when there are none (the hero calls
 * `notFound()` first, so a row only asks for a slug that has them).
 */
export async function landingFactsOf<Type extends LandingType>(
  type: Type,
  slug: string,
): Promise<Extract<LandingFacts, { type: Type }> | Unavailable> {
  const facts = await getLandingFacts(type, slug);
  if (isUnavailable(facts)) {
    return facts;
  }
  if (facts?.type !== type) {
    throw new Error(`no ${type} facts for ${slug}`);
  }
  return facts as Extract<LandingFacts, { type: Type }>;
}

/** A switch's tab labels from the facts' chips (a keyword or a theme per tab), in their order */
export type ChipTab = Readonly<{ key: string; name: string }>;

export const chipTabs = (
  chips: ReadonlyArray<Readonly<{ slug: string; name: string }>>,
): ReadonlyArray<ChipTab> =>
  chips.map((chip) => ({ key: chip.slug, name: chip.name }));
