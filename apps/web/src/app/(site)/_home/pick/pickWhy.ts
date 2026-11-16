import type { TvSeries } from '@tvseri.es/schemas';
import { isOver } from '@tvseri.es/utils';

import { formatDay } from '@/lib/format/datePattern';
import { plural } from '@/lib/format/text';

import { daysBetween } from '../data/day';
import { firstGenre } from '../genres';
import { seasonsLabel, showSeasons } from '../showFacts';

/**
 * The "why" line under a pick, derived from the
 * show's own fields so any deck gets a line. First rule that matches wins:
 *
 * 1. A new season starts within a week (the next episode is an episode 1):
 *    "Season 7 premieres tonight" / "tomorrow" / "Saturday".
 * 2. A running first season that started in the last twelve months:
 *    "New this year: 10 episodes".
 * 3. Ended (or cancelled) after one season: "Complete: 8 episodes".
 * 4. Ended after two or three seasons, rated 8.5 or more:
 *    "Two perfect seasons, 12 episodes".
 * 5. Any other ended show: "Ended: 6 seasons, 36 episodes".
 * 6. Running, and the latest season finished in the last twelve months:
 *    "Season 3 is out: 11 episodes" (the latest aired episode is its last).
 * 7. Running for five seasons or more: "7 seasons and still going".
 * 8. Otherwise the size of it: "3 seasons, 24 episodes".
 *
 * `today` is `YYYY-MM-DD` (the cached home day), so the server and the
 * client draw the same line.
 */

const YEAR_DAYS = 365;
const PERFECT_RATING = 8.5;
const LONG_RUN = 5;

const COUNT_WORDS = ['', 'One', 'Two', 'Three'] as const;

/** Whole calendar days between two dates (`YYYY-MM-DD`, a time after it is ignored) */
const daysFrom = (from: string, to: string) =>
  daysBetween(from.slice(0, 10), to.slice(0, 10));

const episodesLabel = (count: number) => plural(count, 'episode');

const isEnded = (series: TvSeries) => isOver(series.status);

function premiereLine(series: TvSeries, today: string): string | null {
  const next = series.nextEpisodeToAir;
  if (!next?.airDate || next.episodeNumber !== 1) {
    return null;
  }
  const days = daysFrom(today, next.airDate);
  if (days < 0 || days > 6) {
    return null;
  }
  const when =
    days === 0
      ? 'tonight'
      : days === 1
        ? 'tomorrow'
        : formatDay(next.airDate.slice(0, 10), 'EEEE');
  return `Season ${next.seasonNumber} premieres ${when}`;
}

function latestSeasonLine(series: TvSeries, today: string): string | null {
  const last = series.lastEpisodeToAir;
  const next = series.nextEpisodeToAir;
  if (
    !last?.airDate ||
    last.seasonNumber !== series.numberOfSeasons ||
    next?.seasonNumber === last.seasonNumber
  ) {
    return null;
  }
  const days = daysFrom(last.airDate, today);
  return days >= 0 && days <= YEAR_DAYS
    ? `Season ${last.seasonNumber} is out: ${episodesLabel(last.episodeNumber)}`
    : null;
}

export function pickWhy(series: TvSeries, today: string): string {
  const seasons = series.numberOfSeasons;
  const episodes = series.numberOfEpisodes;
  const premiere = premiereLine(series, today);
  if (premiere) {
    return premiere;
  }
  if (!isEnded(series) && seasons === 1 && series.firstAirDate) {
    const age = daysFrom(series.firstAirDate, today);
    if (age >= 0 && age <= YEAR_DAYS) {
      return `New this year: ${episodesLabel(episodes)}`;
    }
  }
  if (isEnded(series)) {
    if (seasons === 1) {
      return `Complete: ${episodesLabel(episodes)}`;
    }
    const word = COUNT_WORDS[seasons];
    if (word && series.voteAverage >= PERFECT_RATING) {
      return `${word} perfect seasons, ${episodesLabel(episodes)}`;
    }
    return `Ended: ${seasonsLabel(seasons)}, ${episodesLabel(episodes)}`;
  }
  const latest = latestSeasonLine(series, today);
  if (latest) {
    return latest;
  }
  if (seasons >= LONG_RUN) {
    return `${seasons} seasons and still going`;
  }
  return `${seasonsLabel(seasons)}, ${episodesLabel(episodes)}`;
}

/** The result's meta line: "2023 · 3 seasons · Comedy" (each may be empty) */
export function pickMeta(series: TvSeries) {
  return {
    genre: firstGenre(series),
    seasons: showSeasons(series),
    year: series.releaseYear,
  };
}
