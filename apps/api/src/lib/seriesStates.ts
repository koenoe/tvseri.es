import type {
  SeriesFacts,
  SeriesStates,
  SeriesViewerState,
} from '@tvseri.es/schemas';
import { isOver } from '@tvseri.es/utils';
import { getLibraryIds } from '@/lib/db/list';
import { getSeriesPrefsMany } from '@/lib/db/prefs';
import { analyzeShow } from '@/lib/overview/analyze';
import { seasonProgress } from '@/lib/overview/blocks';
import { readShowItems } from '@/lib/rollups';
import { getSeriesFacts } from '@/lib/seriesFacts';
import { logWarn } from '@/utils/logWarn';

const NO_PREFS = { paused: null, pausedAt: null, skipped: [] } as const;

/**
 * Everything aired is watched: still coming (not Ended or Canceled, Waiting
 * for's rule) is up to date, with the next episode's date when TMDB has one;
 * else finished, which is also the answer when the facts couldn't be read.
 */
const caughtUp = (
  facts: SeriesFacts | undefined,
  onWatchlist: boolean,
): SeriesViewerState => {
  if (!facts || isOver(facts.status)) {
    return { onWatchlist, state: 'finished' };
  }
  const nextAirDate = facts.nextEpisodeToAir?.airDate;
  return {
    ...(nextAirDate && { nextAirDate }),
    onWatchlist,
    state: 'up-to-date',
  };
};

/**
 * The viewer's relationship with each asked show, from their list placement
 * (`getLibraryIds`: one keys-only Query for any number of ids). Only the
 * shows they have started cost more: facts for those in progress or
 * finished, and prefs and watched items (summaries) for those in progress,
 * read side by side. An in-progress show's next episode is the profile's Up
 * next rule (`analyzeShow`), so this and Continue watching agree.
 */
export const getSeriesStates = async (
  userId: string,
  ids: ReadonlyArray<number>,
  now: number,
): Promise<SeriesStates> => {
  const library = await getLibraryIds(userId);
  const inProgress = new Set(library.inProgress);
  const finished = new Set(library.watched);
  const watchlist = new Set(library.watchlist);

  const watching = ids.filter((id) => inProgress.has(id));
  const started = ids.filter((id) => inProgress.has(id) || finished.has(id));

  const [facts, prefs, watched] = await Promise.all([
    getSeriesFacts(started).catch((error: unknown) => {
      logWarn('Series states: facts read failed, answering without', error);
      return new Map<number, SeriesFacts>();
    }),
    getSeriesPrefsMany(userId, watching),
    readShowItems(userId, watching),
  ]);

  const stateOf = (id: number): SeriesViewerState => {
    const onWatchlist = watchlist.has(id);
    const showFacts = facts.get(id);

    if (inProgress.has(id)) {
      if (!showFacts) {
        return { onWatchlist, state: 'watching' };
      }
      const show = analyzeShow(
        {
          facts: showFacts,
          prefs: prefs.get(id) ?? NO_PREFS,
          watched: watched.get(id) ?? [],
        },
        now,
      );
      if (!show.nextUp) {
        return caughtUp(showFacts, onWatchlist);
      }
      return {
        next: {
          episodeNumber: show.nextUp.episode,
          seasonNumber: show.nextUp.season,
        },
        onWatchlist,
        ...seasonProgress(show, show.nextUp.season),
        state: 'watching',
      };
    }
    if (finished.has(id)) {
      return caughtUp(showFacts, onWatchlist);
    }
    return { onWatchlist, state: onWatchlist ? 'watchlist' : 'new' };
  };

  return {
    states: Object.fromEntries(ids.map((id) => [String(id), stateOf(id)])),
  };
};
