import type { StatsNightEpisode, StatsShowRow } from '@tvseri.es/schemas';
import { DAY_MS } from '@tvseri.es/utils';

import { longWeekdayMonthDay } from '@/lib/format/date';
import { plural } from '@/lib/format/text';
import { dateMs, monthName, shortDay } from '@/lib/stats/weeks';

/** A show's regular seasons and their sizes (`SeriesArt['seasons']`) */
export type SeasonSizes = ReadonlyArray<
  Readonly<{ number: number; episodes: number }>
> | null;

export type NightSeries = Readonly<{
  seriesId: number;
  title: string;
  slug: string;
  /** That show's episodes of the night */
  items: ReadonlyArray<StatsNightEpisode>;
}>;

/**
 * The show a night is about: the one with most episodes in it, the first
 * watched on a tie (a night is usually one show).
 */
export function dominantSeries(
  items: ReadonlyArray<StatsNightEpisode>,
): NightSeries | undefined {
  const bySeries = new Map<number, StatsNightEpisode[]>();
  for (const item of items) {
    bySeries.set(item.seriesId, [...(bySeries.get(item.seriesId) ?? []), item]);
  }
  let best: NightSeries | undefined;
  for (const [seriesId, own] of bySeries) {
    const first = own[0];
    if (first && (!best || own.length > best.items.length)) {
      best = { items: own, seriesId, slug: first.slug, title: first.title };
    }
  }
  return best;
}

const ordered = (items: ReadonlyArray<StatsNightEpisode>) =>
  [...items].sort(
    (a, b) =>
      a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber,
  );

/** Every episode of every regular season was in the night */
function coversShow(
  items: ReadonlyArray<StatsNightEpisode>,
  seasons: SeasonSizes,
): boolean {
  if (!seasons || seasons.length === 0) {
    return false;
  }
  const seen = new Set(
    items.map((item) => `${item.seasonNumber}:${item.episodeNumber}`),
  );
  return seasons.every(
    (season) =>
      season.episodes > 0 &&
      Array.from({ length: season.episodes }, (_, index) => index + 1).every(
        (number) => seen.has(`${season.number}:${number}`),
      ),
  );
}

/**
 * The line under the badge, from how much of the show the night was:
 * the whole show; all of a season; the back half (a run to the season's end
 * that starts past its middle); the first half (a run from episode 1 that
 * ends at or before the middle); one episode by its number; otherwise a
 * count ("4 episodes of season 2", "5 episodes across 2 seasons"). Without
 * the season's size only the count and the single episode can be said.
 */
export function nightLine(
  items: ReadonlyArray<StatsNightEpisode>,
  seasons: SeasonSizes,
): string | undefined {
  const sorted = ordered(items);
  const first = sorted[0];
  const last = sorted.at(-1);
  if (!first || !last) {
    return undefined;
  }
  if (coversShow(sorted, seasons)) {
    return 'The whole series';
  }
  const count = sorted.length;
  if (first.seasonNumber !== last.seasonNumber) {
    const seasonCount = new Set(sorted.map((item) => item.seasonNumber)).size;
    return `${plural(count, 'episode')} across ${seasonCount} seasons`;
  }
  if (count === 1) {
    return `Episode ${first.episodeNumber}`;
  }
  const season = first.seasonNumber;
  const size =
    seasons?.find((candidate) => candidate.number === season)?.episodes ?? 0;
  const start = first.episodeNumber;
  const end = last.episodeNumber;
  const contiguous = end - start + 1 === count;
  if (size > 0 && contiguous) {
    if (start === 1 && end === size) {
      return `All of season ${season}`;
    }
    if (end === size && start * 2 > size) {
      return `The back half of season ${season}`;
    }
    if (start === 1 && end * 2 <= size) {
      return `The first half of season ${season}`;
    }
  }
  return `${plural(count, 'episode')} of season ${season}`;
}

/**
 * "Also big: Adolescence, all 4 on Sat 15 Mar": "all N" when the night covered
 * every episode of the show, else "N episodes".
 */
export function alsoBigText(
  items: ReadonlyArray<StatsNightEpisode>,
  date: string,
  seasons: SeasonSizes,
): string | undefined {
  const series = dominantSeries(items);
  if (!series) {
    return undefined;
  }
  const count = series.items.length;
  const amount = coversShow(series.items, seasons)
    ? `all ${count}`
    : plural(count, 'episode');
  return `Also big: ${series.title}, ${amount} on ${shortDay(dateMs(date))}`;
}

/** "Saturday 27 December" (the card's accessible name) */
export function longDay(date: string): string {
  const ms = dateMs(date);
  const at = new Date(ms);
  return longWeekdayMonthDay(
    { day: at.getUTCDate(), month: at.getUTCMonth() },
    at.getUTCDay(),
  );
}

const BINGE_MAX_DAYS = 31;
const BINGE_MIN_EPISODES = 4;

/** Calendar days (UTC) from the first to the last watch, both counted */
const spanDays = (
  show: Pick<StatsShowRow, 'firstWatchedAt' | 'lastWatchedAt'>,
) =>
  Math.floor(show.lastWatchedAt / DAY_MS) -
  Math.floor(show.firstWatchedAt / DAY_MS) +
  1;

/**
 * The year's longest binge: among shows watched (first to last episode of the
 * year) within 31 days and with at least 4 episodes, the one with the most
 * episodes; the shorter span, then the earlier in the list, on a tie.
 */
export function pickBinge(
  shows: ReadonlyArray<StatsShowRow>,
): StatsShowRow | undefined {
  let best: StatsShowRow | undefined;
  for (const show of shows) {
    if (show.episodes < BINGE_MIN_EPISODES || spanDays(show) > BINGE_MAX_DAYS) {
      continue;
    }
    if (
      !best ||
      show.episodes > best.episodes ||
      (show.episodes === best.episodes && spanDays(show) < spanDays(best))
    ) {
      best = show;
    }
  }
  return best;
}

/**
 * "Barry, all 4 seasons in 3 weeks of August": "all N seasons" when every
 * regular season was watched in the year (episodes watched reach the show's
 * total), "all N episodes" for a one-season show, else the count; the span in
 * days under a week and whole weeks above; "of August" when it sits in one
 * month (UTC).
 */
export function bingeText(
  show: Pick<
    StatsShowRow,
    'title' | 'episodes' | 'firstWatchedAt' | 'lastWatchedAt'
  >,
  seasons: SeasonSizes,
): string {
  const total = (seasons ?? []).reduce(
    (sum, season) => sum + season.episodes,
    0,
  );
  const complete = total > 0 && show.episodes >= total;
  let amount = plural(show.episodes, 'episode');
  if (complete) {
    amount =
      (seasons?.length ?? 0) > 1
        ? `all ${seasons?.length} seasons`
        : `all ${show.episodes} episodes`;
  }
  const days = spanDays(show);
  const span =
    days < 7 ? plural(days, 'day') : plural(Math.round(days / 7), 'week');
  const first = new Date(show.firstWatchedAt);
  const last = new Date(show.lastWatchedAt);
  const sameMonth =
    first.getUTCFullYear() === last.getUTCFullYear() &&
    first.getUTCMonth() === last.getUTCMonth();
  const month = sameMonth ? ` of ${monthName(first.getUTCMonth())}` : '';
  return `${show.title}, ${amount} in ${span}${month}`;
}
