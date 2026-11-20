import type { UpNextItem } from '@tvseri.es/schemas';
import { formatRuntime, hasAiredAt } from '@tvseri.es/utils';

import { formatAirWeekdayDate } from '@/lib/format/airDate';
import { formatMonthYear } from '@/lib/format/date';
import { formatWhen } from '@/lib/format/when';

/**
 * The Up next card's words (the profile hero, Home's Continue watching
 * tile), as pure functions with an injected clock. Days are UTC calendar days: the
 * card renders on the server and hydrates in the viewer's zone, and both
 * must write the same words.
 */

/** One fact of the card's facts line; the line picks the glyph by `kind` */
export type UpNextFact = Readonly<{
  kind:
    | 'aired'
    | 'runtime'
    | 'latest'
    | 'finale'
    | 'next'
    | 'left'
    | 'seasons'
    | 'status'
    | 'total'
    | 'people'
    | 'trending';
  text: string;
  /** The one highlighted fact of the line */
  highlight?: boolean;
}>;

function toPercent(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (part / total) * 100));
}

/**
 * Where airing stops, 0 to 100; 100 (no tick) when everything of the season
 * aired. Counted from the season's first number (TMDB numbers some shows on
 * across seasons).
 */
export function airedPercent(item: UpNextItem): number {
  const { nextToAir, season, seasonTotal } = item;
  if (!nextToAir || nextToAir.season !== season || seasonTotal <= 0) {
    return 100;
  }
  const aired = nextToAir.episode - (item.firstEpisodeNumber ?? 1);
  return toPercent(aired, seasonTotal);
}

/** Done in the season (watched or skipped); watched on an answer without it */
const seasonDoneOf = (item: UpNextItem) =>
  item.seasonDone ?? item.seasonWatched;

/** The fill: done (watched or skipped) of the season; watched on an older answer */
export function watchedPercent(item: UpNextItem): number {
  return toPercent(seasonDoneOf(item), item.seasonTotal);
}

/**
 * "1 of 8 watched" (the bold half) and "1 to watch"; with skips in the
 * season it counts done, as the fill does: "3 of 8 done".
 */
export function progressLabel(item: UpNextItem) {
  const done = seasonDoneOf(item);
  const watched =
    done > item.seasonWatched
      ? `${done} of ${item.seasonTotal} done`
      : `${item.seasonWatched} of ${item.seasonTotal} watched`;
  return { toWatch: `${item.toWatch} to watch`, watched };
}

/** The card link's name: "Dexter, S02E02 Fallen" */
export const itemLabel = (item: UpNextItem) =>
  item.episodeTitle
    ? `${item.title}, ${item.code} ${item.episodeTitle}`
    : `${item.title}, ${item.code}`;

/** "Last watched S02E01 yesterday" / "… Oct 26"; a visitor reads "today", not hours */
export function lastWatchedLabel(
  item: Pick<UpNextItem, 'lastWatchedAt' | 'lastWatchedCode'>,
  now: number,
): string | null {
  if (item.lastWatchedAt === null || item.lastWatchedCode === null) {
    return null;
  }
  const when = formatWhen(item.lastWatchedAt, now, { capital: false });
  return `Last watched ${item.lastWatchedCode} ${when}`;
}

/**
 * What is next for the season: "Next Sun Nov 15" for its next episode still
 * to air (as the progress bar's tick: another season's date, or one that
 * has aired, is no next of this one), else "Next season TBA"
 */
function nextFact(item: UpNextItem, now: number): UpNextFact | null {
  const upcoming = item.nextToAir;
  if (upcoming) {
    return upcoming.season === item.season && !hasAiredAt(upcoming.airDate, now)
      ? {
          kind: 'next',
          text: `Next ${formatAirWeekdayDate(upcoming.airDate, now)}`,
        }
      : null;
  }
  return item.nextSeasonTba ? { kind: 'next', text: 'Next season TBA' } : null;
}

function leftFact(item: UpNextItem): UpNextFact {
  const time = formatRuntime(item.timeLeftMinutes);
  return {
    kind: 'left',
    text: time ? `${item.toWatch} left · ${time}` : `${item.toWatch} left`,
  };
}

/**
 * The facts line of your own next episode: airing is runtime, Latest
 * episode, Next date; a full season out is Aired month, runtime, "4 left ·
 * 3h 50m"; a finale is runtime, Season finale, Next season TBA.
 */
export function ownerFacts(item: UpNextItem, now: number): UpNextFact[] {
  const quiet = !item.isLatest && !item.seasonFinale;
  const runtime = formatRuntime(item.runtime);
  const facts: Array<UpNextFact | null> = [
    quiet && item.airDate
      ? { kind: 'aired', text: `Aired ${formatMonthYear(item.airDate)}` }
      : null,
    runtime ? { kind: 'runtime', text: runtime } : null,
    item.isLatest
      ? { highlight: true, kind: 'latest', text: 'Latest episode' }
      : null,
    item.seasonFinale
      ? { highlight: true, kind: 'finale', text: 'Season finale' }
      : null,
    nextFact(item, now),
    quiet && item.toWatch > 1 ? leftFact(item) : null,
  ];
  return facts.filter((fact): fact is UpNextFact => fact !== null);
}
