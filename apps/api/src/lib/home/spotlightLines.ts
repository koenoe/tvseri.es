import type {
  LibraryIds,
  SpotlightLine,
  SpotlightLines,
} from '@tvseri.es/schemas';
import { readThrough, readThroughMany } from '@/lib/db/cache/readThrough';
import { getSeriesPrefsMany } from '@/lib/db/prefs';
import { fetchTrending } from '@/lib/mdblist';
import { analyzeShow } from '@/lib/overview/analyze';
import { readShowItems } from '@/lib/rollups';
import { getSeriesFacts } from '@/lib/seriesFacts';
import { fetchTvSeriesForPicks } from '@/lib/tmdb';
import { logWarn } from '@/utils/logWarn';

const SHARED_TTL = 7 * 86400;
/** A show TMDB doesn't know is not asked about again for a day */
const MISSING_TTL = 86400;
const TRENDING_TTL = 3600;
const CONCURRENCY = 5;
/** In-progress shows read for "up to date" (one Watched query each) */
const MAX_UP_TO_DATE_CHECKS = 6;
/** "Top rated": a show many people rate highly */
const TOP_RATED = { minAverage: 8, minVotes: 1000 } as const;

/** What the lines are made of, the same for every viewer (Cache table, 7 days) */
type ShowFacts = Readonly<{
  genre: string | null;
  recommendations: ReadonlyArray<Readonly<{ id: number; title: string }>>;
  voteAverage: number;
  voteCount: number;
}>;

type Missing = Readonly<{ missing: true }>;

const loadFacts = async (id: number): Promise<ShowFacts | Missing> => {
  const picks = await fetchTvSeriesForPicks(id);
  if (!picks) {
    return { missing: true };
  }
  return {
    genre: picks.series.genres[0]?.name ?? null,
    recommendations: picks.recommendations.map((item) => ({
      id: item.id,
      title: item.title,
    })),
    voteAverage: picks.series.voteAverage,
    voteCount: picks.series.voteCount,
  };
};

/**
 * The shows' facts in one Cache-table read, TMDB for the misses; a show
 * whose facts can't be had is left out
 */
const factsOf = async (
  ids: ReadonlyArray<number>,
): Promise<ReadonlyMap<number, ShowFacts>> => {
  const facts = await readThroughMany(ids, {
    concurrency: CONCURRENCY,
    failures: 'tolerate',
    key: (id) => `home:spotlight-line:v1:${id}`,
    load: loadFacts,
    ttl: (value) => ('missing' in value ? MISSING_TTL : SHARED_TTL),
  });
  return new Map(
    [...facts].flatMap(([id, value]) =>
      'missing' in value ? [] : [[id, value] as const],
    ),
  );
};

/** A recommendation the viewer favourited, else one they finished */
const likedLine = (facts: ShowFacts, ids: LibraryIds): SpotlightLine | null => {
  const favourite = facts.recommendations.find((rec) =>
    ids.favorites.includes(rec.id),
  );
  if (favourite) {
    return { kind: 'favorite', title: favourite.title };
  }
  const finished = facts.recommendations.find((rec) =>
    ids.watched.includes(rec.id),
  );
  return finished ? { kind: 'finished', title: finished.title } : null;
};

/** Recommendations the viewer is watching: the up-to-date candidates */
const watchingOf = (facts: ShowFacts, ids: LibraryIds) =>
  facts.recommendations.filter((rec) => ids.inProgress.includes(rec.id));

/**
 * The first rule that holds: a recommendation the viewer favourited, one
 * they finished, one they're watching and up to date with, else top rated
 * in its genre. Shows already in progress or watched get none (the
 * spotlight shows their state instead).
 */
const lineFor = (
  facts: ShowFacts,
  ids: LibraryIds,
  upToDate: ReadonlySet<number>,
): SpotlightLine | null => {
  const liked = likedLine(facts, ids);
  if (liked) {
    return liked;
  }
  const caughtUp = watchingOf(facts, ids).find((rec) => upToDate.has(rec.id));
  if (caughtUp) {
    return { kind: 'up-to-date', title: caughtUp.title };
  }
  if (
    facts.genre &&
    facts.voteAverage >= TOP_RATED.minAverage &&
    facts.voteCount >= TOP_RATED.minVotes
  ) {
    return { genre: facts.genre, kind: 'top-rated' };
  }
  return null;
};

const NO_PREFS = { paused: null, pausedAt: null, skipped: [] } as const;

/**
 * Which of these in-progress shows the viewer is up to date with: no aired
 * episode left that they haven't watched or skipped (the overview's own
 * analysis, with the loaders `getOverview` uses). Best-effort: a failed
 * read means no up-to-date line, never a failed request.
 */
const upToDateOf = async (
  userId: string,
  showIds: ReadonlyArray<number>,
): Promise<ReadonlySet<number>> => {
  if (showIds.length === 0) {
    return new Set();
  }
  try {
    const now = Date.now();
    // The shows' watched items: their summaries in one batch read
    const [facts, prefs, watched] = await Promise.all([
      getSeriesFacts(showIds),
      getSeriesPrefsMany(userId, showIds),
      readShowItems(userId, showIds),
    ]);
    const caughtUp = showIds.filter((id) => {
      const showFacts = facts.get(id);
      return (
        !!showFacts &&
        analyzeShow(
          {
            facts: showFacts,
            prefs: prefs.get(id) ?? NO_PREFS,
            watched: watched.get(id) ?? [],
          },
          now,
        ).unwatched.length === 0
      );
    });
    return new Set(caughtUp);
  } catch (error) {
    logWarn('Spotlight lines: up-to-date check failed, leaving it out', error);
    return new Set();
  }
};

/**
 * The spotlight's shows: the trending list, already cut to its head
 * (`LIST_SIZES.trending`; some lack a backdrop), cached an hour
 */
const trendingIds = (): Promise<ReadonlyArray<number>> =>
  readThrough('home:spotlight-ids:v1', TRENDING_TTL, fetchTrending);

/**
 * Why each show of the spotlight is for this viewer. Only ever about the
 * API's own trending list, so a caller can't make it look up other shows.
 */
export const spotlightLines = async (
  userId: string,
  ids: LibraryIds,
): Promise<SpotlightLines> => {
  const showIds = await trendingIds();
  const owned = new Set([...ids.watched, ...ids.inProgress]);
  const facts = await factsOf(showIds.filter((id) => !owned.has(id)));

  // Only shows without a favourite or finished line need the (per-show)
  // up-to-date check, and only for the few recommendations being watched
  const candidates = [
    ...new Set(
      [...facts.values()].flatMap((showFacts) =>
        likedLine(showFacts, ids)
          ? []
          : watchingOf(showFacts, ids).map((rec) => rec.id),
      ),
    ),
  ].slice(0, MAX_UP_TO_DATE_CHECKS);
  const upToDate = await upToDateOf(userId, candidates);

  const lines: Record<string, SpotlightLine | null> = {};
  for (const id of showIds) {
    const showFacts = facts.get(id);
    lines[String(id)] = showFacts ? lineFor(showFacts, ids, upToDate) : null;
  }
  return { lines };
};
