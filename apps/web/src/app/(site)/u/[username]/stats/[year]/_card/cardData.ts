import 'server-only';

import type { StatsShowRow } from '@tvseri.es/schemas';
import { getYears } from '@/lib/stats/getYears';
import {
  getDaily,
  getSeriesArt,
  getShows,
  getStatsUser,
  getSummary,
  getWeekly,
  isUnavailable,
} from '@/lib/stats/loaders';

import { buildCardModel, byHours, type CardModel } from './cardModel';
import { exactUser } from './cardUser';

/**
 * The card's data, composed from the page's cached loaders (the same reads
 * and cache entries as the page, so the card never says anything the page
 * doesn't). A failed read makes the whole card `unavailable` rather than
 * drawing a partial card the CDN would then keep for a day.
 */

type CardData = Readonly<{
  status: 'ready';
  userId: string;
  model: CardModel;
  /** The #1 show's `backdropColor` (the Colour theme), as the API sends it */
  colour: string | null;
}>;

/** No card; `userId` when the user is known (the entry carries their tags) */
type NoCard = Readonly<{ status: 'not-found'; userId: string | null }>;

type CardDataResult = CardData | NoCard | 'unavailable';

/** The #1 show's colour: the Colour theme and its swatch */
async function topColour(
  shows: ReadonlyArray<StatsShowRow>,
): Promise<string | null | 'unavailable'> {
  const top = byHours(shows)[0];
  if (!top) {
    return null;
  }
  const art = await getSeriesArt(top.id);
  if (isUnavailable(art)) {
    return 'unavailable';
  }
  return art?.backdropColor ?? null;
}

/** Every other year's show count, for "the most yet" */
async function otherShowCounts(
  userId: string,
  year: number,
): Promise<ReadonlyArray<number> | 'unavailable'> {
  const years = await getYears(userId);
  if (isUnavailable(years)) {
    return 'unavailable';
  }
  const summaries = await Promise.all(
    years.years
      .filter((item) => item.year !== year)
      .map((item) => getSummary(userId, item.year)),
  );
  if (summaries.some(isUnavailable)) {
    return 'unavailable';
  }
  return summaries.flatMap((summary) =>
    isUnavailable(summary) ? [] : [summary.current.seriesCount],
  );
}

/**
 * A finished year's card for `username`: `not-found` for an unknown user,
 * a param that isn't the user's exact username (`exactUser`), or a year
 * without episodes (no stats page, no card). The caller checks that the
 * year is over.
 */
export async function getCardData(
  username: string,
  year: number,
): Promise<CardDataResult> {
  const found = await getStatsUser(username);
  if (isUnavailable(found)) {
    return 'unavailable';
  }
  const user = exactUser(username, found);
  if (user === null) {
    return { status: 'not-found', userId: null };
  }
  const [summary, weekly, daily, shows, others] = await Promise.all([
    getSummary(user.id, year),
    getWeekly(user.id, year),
    getDaily(user.id, year),
    getShows(user.id, year),
    otherShowCounts(user.id, year),
  ]);
  if (
    isUnavailable(summary) ||
    isUnavailable(weekly) ||
    isUnavailable(daily) ||
    isUnavailable(shows) ||
    others === 'unavailable'
  ) {
    return 'unavailable';
  }
  if (summary.current.episodeCount === 0) {
    return { status: 'not-found', userId: user.id };
  }
  const colour = await topColour(shows.shows);
  if (colour === 'unavailable') {
    return 'unavailable';
  }
  return {
    colour,
    model: buildCardModel({
      otherShowCounts: others,
      shows: shows.shows,
      streak: daily.longestStreak,
      summary,
      username: user.username,
      weeks: weekly.map((week) => week.episodes),
      year,
    }),
    status: 'ready',
    userId: user.id,
  };
}
