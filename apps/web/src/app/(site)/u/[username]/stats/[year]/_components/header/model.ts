import type {
  StatsDaily,
  StatsFavoritesCount,
  StatsSummary,
} from '@tvseri.es/schemas';
import { yearWeekIndex } from '@tvseri.es/utils';
import { plural } from '@/lib/format/text';
import { formatGrouped } from '@/lib/formatCount';
import {
  formatAverage,
  formatStatsRuntime,
  percentageDelta,
} from '../../_lib/format';
import { dateMs, WEEKS } from '../../_lib/weeks';

export type TileIcon =
  | 'runtime'
  | 'episodes'
  | 'average'
  | 'series'
  | 'streak'
  | 'favorites';

/** The change line of a tile: cyan ↑ / pink ↓ with the change, then "vs. …" */
export type TileDelta = Readonly<{
  direction: 'up' | 'down' | null;
  /** "35%" or "34"; null when nothing changed */
  amount: string | null;
  versus: string;
}>;

export type TileModel = Readonly<{
  icon: TileIcon;
  label: string;
  value: string;
  delta: TileDelta;
}>;

type TilesInput = Readonly<{
  summary: StatsSummary;
  favorites: StatsFavoritesCount;
  year: number;
  /** The year the user joined: nothing before it to compare with */
  firstYear: boolean;
}>;

const FIRST_YEAR_COPY = 'First year on tvseri.es';

/** Percentage change on the first four tiles; no arrow at 0% */
const percent = (
  current: number,
  previous: number,
): Omit<TileDelta, 'versus'> => {
  const change = percentageDelta(current, previous);
  if (change === 0) {
    return { amount: null, direction: null };
  }
  return {
    amount: `${Math.abs(change)}%`,
    direction: change > 0 ? 'up' : 'down',
  };
};

/** Absolute change on streak and favourites; no arrow at 0 */
const absolute = (
  current: number,
  previous: number,
): Omit<TileDelta, 'versus'> => {
  const change = current - previous;
  if (change === 0) {
    return { amount: null, direction: null };
  }
  return {
    amount: formatGrouped(Math.abs(change)),
    direction: change > 0 ? 'up' : 'down',
  };
};

/**
 * The six tiles under the header (today's live numbers): value, the change
 * against the year before and "vs. <that year's value> (2024)".
 */
export function buildTiles({
  summary,
  favorites,
  year,
  firstYear,
}: TilesInput): ReadonlyArray<TileModel> {
  const { current, previous } = summary;
  const before = `(${year - 1})`;
  const tile = (
    icon: TileIcon,
    label: string,
    value: string,
    previousValue: string,
    change: Omit<TileDelta, 'versus'>,
    baseline: number,
  ): TileModel => ({
    // Nothing to compare with (a quiet year before): no change, no "vs. 0"
    delta: firstYear
      ? { amount: null, direction: null, versus: FIRST_YEAR_COPY }
      : baseline === 0
        ? { amount: null, direction: null, versus: '' }
        : { ...change, versus: `vs. ${previousValue} ${before}` },
    icon,
    label,
    value,
  });
  return [
    tile(
      'runtime',
      'Total runtime',
      formatStatsRuntime(current.totalRuntime),
      formatStatsRuntime(previous.totalRuntime),
      percent(current.totalRuntime, previous.totalRuntime),
      previous.totalRuntime,
    ),
    tile(
      'episodes',
      'Episodes watched',
      formatGrouped(current.episodeCount),
      formatGrouped(previous.episodeCount),
      percent(current.episodeCount, previous.episodeCount),
      previous.episodeCount,
    ),
    tile(
      'average',
      'Average per day',
      formatAverage(current.avgPerDay),
      formatAverage(previous.avgPerDay),
      percent(current.avgPerDay, previous.avgPerDay),
      previous.avgPerDay,
    ),
    tile(
      'series',
      'Series tracked',
      formatGrouped(current.seriesCount),
      formatGrouped(previous.seriesCount),
      percent(current.seriesCount, previous.seriesCount),
      previous.seriesCount,
    ),
    tile(
      'streak',
      'Longest streak',
      plural(current.longestStreak, 'day'),
      plural(previous.longestStreak, 'day'),
      absolute(current.longestStreak, previous.longestStreak),
      previous.longestStreak,
    ),
    tile(
      'favorites',
      'Added to favourites',
      formatGrouped(favorites.current),
      formatGrouped(favorites.previous),
      absolute(favorites.current, favorites.previous),
      favorites.previous,
    ),
  ];
}

/** The tooltip's bold line: "13 episodes", "1 episode", "Nothing watched" */
export const weekTitle = (episodes: number) =>
  episodes === 0 ? 'Nothing watched' : plural(episodes, 'episode');

/** The change's direction in words, for the arrow screen readers skip */
export const directionWord = (direction: TileDelta['direction']) => {
  if (direction === 'up') {
    return 'Up';
  }
  return direction === 'down' ? 'Down' : null;
};

/** A week's slot along the 53 (0 to 52) that a date falls in, clamped to the year */
const slotOf = (date: string, year: number) =>
  yearWeekIndex(dateMs(date), year);

export type StreakBracket = Readonly<{
  /** Percent of the chart width */
  left: number;
  width: number;
  label: string;
  /** Too close to the right edge to start the label at the bracket's left */
  labelAtEnd: boolean;
}>;

/** Beyond this the label (about a tenth of the chart) would run off the end */
const LABEL_FLIP_AT = 72;

/**
 * The bracket under the weeks of the longest streak ("42 days in a row"):
 * from the week the streak starts in to the week it ends in.
 */
export function streakBracket(
  streak: StatsDaily['longestStreak'],
  year: number,
): StreakBracket | null {
  if (!streak || streak.days < 2) {
    return null;
  }
  const first = slotOf(streak.from, year);
  const last = slotOf(streak.to, year);
  const left = (first / WEEKS) * 100;
  return {
    label: `${formatGrouped(streak.days)} days in a row`,
    labelAtEnd: left > LABEL_FLIP_AT,
    left,
    width: ((last - first + 1) / WEEKS) * 100,
  };
}

/** This year's streak beats the longest of every other year */
export const longestStreakYet = (
  streak: number,
  others: ReadonlyArray<number>,
) => streak > 0 && others.every((other) => streak > other);
