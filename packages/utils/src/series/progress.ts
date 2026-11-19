import { type EpisodeRef, episodeCode } from '@tvseri.es/schemas';

import { episodeNumbersOf } from './episodeNumbers';

/**
 * A season as progress reads it: how many of its episodes have aired (its
 * first `airedCount`, numbered from `firstEpisodeNumber`: 1 unless TMDB
 * numbers the show on across seasons). Season 0 (specials) never counts.
 */
type ProgressSeason = Readonly<{
  seasonNumber: number;
  airedCount: number;
  firstEpisodeNumber?: number;
}>;

export type SeasonCounts = Readonly<{
  seasonNumber: number;
  aired: number;
  /** Aired and watched */
  watched: number;
  /** Aired, skipped and not watched */
  skipped: number;
  /** Aired, neither watched nor skipped */
  open: number;
}>;

export type ShowProgress = Readonly<{
  /** The aired regular episodes, in order */
  aired: ReadonlyArray<EpisodeRef>;
  /** Aired and watched: a row outside the aired episodes never counts */
  watched: number;
  /** Aired, skipped and not watched */
  skipped: number;
  /** Aired and watched or skipped: what every fill and percentage draws */
  done: number;
  /** Aired, neither watched nor skipped, in order: what's left */
  open: ReadonlyArray<EpisodeRef>;
  /** The first open episode: what you haven't seen comes first */
  nextUp: EpisodeRef | null;
  /** Any regular episode watched, aired or not (specials and skips aside) */
  started: boolean;
  /** Something aired and every aired episode watched (skips don't count) */
  isComplete: boolean;
  /** Started, something aired, and no aired episode open: Finished */
  isFinished: boolean;
  /** The same counts per regular season, in season order */
  seasons: ReadonlyArray<SeasonCounts>;
}>;

const isRegularCode = (code: string) => !code.startsWith('S00');

type SeasonMarks = Readonly<{
  watched: ReadonlySet<string>;
  skipped: ReadonlySet<string>;
}>;

/** One season's aired episodes, their counts and the open ones, in order */
function readSeason(season: ProgressSeason, marks: SeasonMarks) {
  const aired: EpisodeRef[] = [];
  const open: EpisodeRef[] = [];
  let watched = 0;
  let skipped = 0;
  for (const episodeNumber of episodeNumbersOf(season, season.airedCount)) {
    const ref = { episodeNumber, seasonNumber: season.seasonNumber };
    const code = episodeCode(ref);
    aired.push(ref);
    if (marks.watched.has(code)) {
      watched += 1;
    } else if (marks.skipped.has(code)) {
      skipped += 1;
    } else {
      open.push(ref);
    }
  }
  const counts: SeasonCounts = {
    aired: aired.length,
    open: open.length,
    seasonNumber: season.seasonNumber,
    skipped,
    watched,
  };
  return { aired, counts, open };
}

/**
 * A season (or any set of aired episodes) done, as a show is Finished: one
 * watched at least and none open, so a skip counts as done but skips alone
 * never do. Its eye unmarks it; a mark leaves the skips skipped.
 */
export const isDone = (
  counts: Pick<SeasonCounts, 'open' | 'watched'>,
): boolean => counts.watched > 0 && counts.open === 0;

/**
 * One season's counts by the same rule, specials included (a season's own
 * header); a show's progress is `showProgress`.
 */
export const seasonCounts = (
  season: ProgressSeason,
  marks: Readonly<{ watched: Iterable<string>; skipped: Iterable<string> }>,
): SeasonCounts =>
  readSeason(season, {
    skipped: new Set(marks.skipped),
    watched: new Set(marks.watched),
  }).counts;

/**
 * The one definition of a show's progress, for the API (list placement, the
 * overview, the library) and the web (the show page, the controls, the
 * library ids): from its seasons' aired counts and the viewer's watched and
 * skipped episode codes (`S01E02`).
 */
export function showProgress(
  input: Readonly<{
    seasons: ReadonlyArray<ProgressSeason>;
    watched: Iterable<string>;
    skipped: Iterable<string>;
  }>,
): ShowProgress {
  const marks = {
    skipped: new Set(input.skipped),
    watched: new Set(input.watched),
  };
  const watched = marks.watched;
  const aired: EpisodeRef[] = [];
  const open: EpisodeRef[] = [];
  const seasons: SeasonCounts[] = [];
  let watchedCount = 0;
  let skippedCount = 0;

  const regular = input.seasons
    .filter((season) => season.seasonNumber > 0)
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
  for (const season of regular) {
    const read = readSeason(season, marks);
    aired.push(...read.aired);
    open.push(...read.open);
    watchedCount += read.counts.watched;
    skippedCount += read.counts.skipped;
    seasons.push(read.counts);
  }

  const started = [...watched].some(isRegularCode);
  const somethingAired = aired.length > 0;
  return {
    aired,
    done: watchedCount + skippedCount,
    isComplete: somethingAired && watchedCount === aired.length,
    isFinished: started && somethingAired && open.length === 0,
    nextUp: open[0] ?? null,
    open,
    seasons,
    skipped: skippedCount,
    started,
    watched: watchedCount,
  };
}

/**
 * Which list a show belongs in: Finished (`watched`) once finished, In
 * progress while started with something open, none when nothing regular is
 * watched or nothing has aired.
 */
export type ListState = 'watched' | 'in_progress' | 'none';

export const listStateOf = (
  progress: Pick<ShowProgress, 'aired' | 'isFinished' | 'started'>,
): ListState => {
  if (!progress.started || progress.aired.length === 0) {
    return 'none';
  }
  return progress.isFinished ? 'watched' : 'in_progress';
};
