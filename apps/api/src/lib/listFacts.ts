import type {
  ListItem,
  ListItemFacts,
  SeriesFacts,
  SeriesPrefs,
} from '@tvseri.es/schemas';
import { buildBackdropImageUrl } from '@tvseri.es/utils';

import { getListEntries } from '@/lib/db/list';
import { getSeriesPrefsMany } from '@/lib/db/prefs';
import { analyzeShow, type WatchedEpisode } from '@/lib/overview/analyze';
import { readShowItems } from '@/lib/rollups';
import { getSeriesFacts } from '@/lib/seriesFacts';

const NO_PREFS = { paused: null, pausedAt: null, skipped: [] } as const;

type Progress = ListItemFacts['progress'];

/**
 * Where the owner is in an in-progress show they haven't hidden: up to date
 * when every aired, unskipped regular episode is watched, else the season of
 * the episode they watched most recently.
 */
const inProgressState = (
  facts: SeriesFacts,
  watched: ReadonlyArray<WatchedEpisode>,
  prefs: Pick<SeriesPrefs, 'skipped' | 'paused' | 'pausedAt'>,
  now: number,
): Progress => {
  const state = analyzeShow({ facts, prefs, watched }, now);
  if (state.unwatched.length === 0) {
    return { state: 'up-to-date' };
  }
  const latest = watched
    .filter((episode) => episode.seasonNumber > 0)
    .reduce<WatchedEpisode | null>(
      (newest, episode) =>
        !newest || episode.watchedAt > newest.watchedAt ? episode : newest,
      null,
    );
  return {
    season: latest?.seasonNumber ?? state.nextUp?.season ?? 1,
    state: 'watching',
  };
};

/**
 * `?include=facts` on a list page (the Favourites accordion): each item's
 * series facts and the list owner's own progress. Costs one facts lookup per
 * item, one BatchGetItem for the owner's Finished / In progress entries and
 * prefs, and one Watched query per in-progress item: meant for small pages.
 */
export const withListFacts = async <T extends Pick<ListItem, 'id'>>(
  ownerId: string,
  items: ReadonlyArray<T>,
  now: number,
): Promise<Array<T & Readonly<{ facts: ListItemFacts | null }>>> => {
  const ids = items.map((item) => item.id);
  const [facts, entries] = await Promise.all([
    getSeriesFacts(ids),
    getListEntries(ownerId, ids, ['WATCHED', 'IN_PROGRESS']),
  ]);
  const finished = entries.get('WATCHED') ?? new Map<number, number>();
  const inProgress = [...(entries.get('IN_PROGRESS')?.keys() ?? [])].filter(
    (id) => !finished.has(id) && facts.has(id),
  );

  // The in-progress shows' watched items: their summaries in one batch read
  const [prefs, watched] = await Promise.all([
    getSeriesPrefsMany(ownerId, inProgress),
    readShowItems(ownerId, inProgress),
  ]);

  const progressOf = (id: number, showFacts: SeriesFacts): Progress => {
    const finishedAt = finished.get(id);
    if (finishedAt !== undefined) {
      return { finishedAt, state: 'finished' };
    }
    const episodes = watched.get(id);
    const showPrefs = prefs.get(id) ?? NO_PREFS;
    // Paused: Hide takes the show out of every overview block: no progress
    // line either ("Keep" only stops the asking, so it still counts)
    return episodes && showPrefs.paused !== 'hide'
      ? inProgressState(showFacts, episodes, showPrefs, now)
      : { state: 'none' };
  };

  return items.map((item) => {
    const showFacts = facts.get(item.id);
    return {
      ...item,
      facts: showFacts
        ? {
            backdropImage: showFacts.backdropPath
              ? buildBackdropImageUrl(showFacts.backdropPath)
              : '',
            progress: progressOf(item.id, showFacts),
            seasonCount: showFacts.seasons.length,
            status: showFacts.status,
            totalRuntime: showFacts.totalRuntime,
            type: showFacts.type,
          }
        : null,
    };
  });
};
