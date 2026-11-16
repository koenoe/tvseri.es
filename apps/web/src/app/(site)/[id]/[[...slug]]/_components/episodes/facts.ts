import { formatDuration } from '@/lib/format/duration';
import { plural } from '@/lib/format/text';
import { shortCode } from '@/lib/marking/copy';
import type { SeasonProgress } from '@/lib/marking/progress';
import { airWeekday, formatAirDate } from './format';
import {
  fallbackRuntime,
  isWatchedMark,
  type MarkedEpisode,
  runtimeTotal,
} from './marks';

/**
 * The season facts line, one calm meta line that
 * updates live: not started (and signed out), in progress,
 * complete (with the eye), airing (the next day in pink), announced.
 */
export type SeasonFacts = Readonly<{
  /** "Jun 26, 2024" or "Announced" (calendar icon). */
  date: string;
  /** "10 episodes" / "4 of 10 watched" (season icon). */
  count: string;
  /** The last fact and how it's drawn. */
  last: Readonly<{
    text: string;
    /** clock = time; eye = complete ("Watched"); pink = next day / year. */
    kind: 'clock' | 'eye' | 'pink';
  }> | null;
  /** "1 skipped" after the line, or null. */
  skipped: string | null;
}>;

export function seasonFacts(
  episodes: ReadonlyArray<MarkedEpisode>,
  /** The season's air date when its episodes don't have one. */
  seasonAirDate: string,
  /**
   * The viewer's marks are known (signed in, read). Otherwise an airing
   * season says how many episodes it has, never "0 of 6 watched".
   */
  personal = true,
): SeasonFacts {
  const total = episodes.length;
  const fallback = fallbackRuntime(episodes.map((item) => item.episode));
  const aired = episodes.filter((item) => item.mark !== 'unaired');
  const watched = episodes.filter((item) => isWatchedMark(item.mark)).length;
  const skippedCount = episodes.filter(
    (item) => item.mark === 'skipped',
  ).length;
  const skipped = skippedCount ? `${skippedCount} skipped` : null;
  const firstDate = episodes[0]?.episode.airDate || seasonAirDate;
  const date = formatAirDate(firstDate);
  const episodesLabel = plural(total, 'episode');

  const next = episodes.find((item) => item.mark === 'unaired');
  const day = next ? airWeekday(next.episode.airDate) : '';
  const nextFact = next
    ? ({
        kind: 'pink',
        text: `Next ${shortCode(next.episode.episodeNumber)}${day ? ` ${day}` : ''}`,
      } as const)
    : null;
  if (!aired.length) {
    // A known premiere date is shown with the pink next day, as an airing
    // season's; "Announced" only while no date is known
    return {
      count: episodesLabel,
      date: date || 'Announced',
      last: nextFact,
      skipped,
    };
  }
  if (aired.length < total) {
    return {
      count: personal ? `${watched} of ${aired.length} watched` : episodesLabel,
      date,
      last: nextFact,
      skipped,
    };
  }
  if (watched === 0) {
    const minutes = runtimeTotal(episodes, fallback);
    return {
      count: episodesLabel,
      date,
      last:
        minutes > 0 ? { kind: 'clock', text: formatDuration(minutes) } : null,
      skipped,
    };
  }
  if (watched === total) {
    return {
      count: episodesLabel,
      date,
      last: { kind: 'eye', text: 'Watched' },
      skipped,
    };
  }
  // Left = aired, neither watched nor skipped (one rule for the page)
  const left = runtimeTotal(
    episodes.filter(
      (item) => !isWatchedMark(item.mark) && item.mark !== 'skipped',
    ),
    fallback,
  );
  return {
    count: `${watched} of ${total} watched`,
    date,
    last:
      left > 0 ? { kind: 'clock', text: `${formatDuration(left)} left` } : null,
    skipped,
  };
}

/**
 * Stand-ins for the times the season's episodes give (unknown until they
 * load): as wide as the usual values, so a placeholder line wraps where the
 * real one will.
 */
const RUNTIME_STAND_IN = '0h 00m';
const NEXT_STAND_IN = 'Next E00 Thu';

/**
 * The facts line as `seasonFacts` will draw it, from what is known before
 * the season's episodes load (its air date, its episode count, the viewer's
 * marks): the placeholder draws these words as ghosts, so it takes the
 * lines the real facts will (they wrap whole on a phone).
 */
export function seasonFactsEstimate(
  progress: Pick<SeasonProgress, 'aired' | 'skipped' | 'total' | 'watched'>,
  seasonAirDate: string,
  personal: boolean,
): SeasonFacts {
  const { aired, total, watched } = progress;
  const date = formatAirDate(seasonAirDate);
  const episodesLabel = plural(total, 'episode');
  const skipped = progress.skipped ? `${progress.skipped} skipped` : null;
  const next = { kind: 'pink', text: NEXT_STAND_IN } as const;
  if (!aired) {
    return {
      count: episodesLabel,
      date: date || 'Announced',
      last: next,
      skipped,
    };
  }
  if (aired < total) {
    return {
      count: personal ? `${watched} of ${aired} watched` : episodesLabel,
      date,
      last: next,
      skipped,
    };
  }
  if (!personal || watched === 0) {
    return {
      count: episodesLabel,
      date,
      last: { kind: 'clock', text: RUNTIME_STAND_IN },
      skipped,
    };
  }
  if (watched === total) {
    return {
      count: episodesLabel,
      date,
      last: { kind: 'eye', text: 'Watched' },
      skipped,
    };
  }
  // time left only while something is neither watched nor skipped
  const left = total - watched - progress.skipped > 0;
  return {
    count: `${watched} of ${total} watched`,
    date,
    last: left ? { kind: 'clock', text: `${RUNTIME_STAND_IN} left` } : null,
    skipped,
  };
}
