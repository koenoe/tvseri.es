import { episodeCode, type Ledger, type LedgerShow } from '@tvseri.es/schemas';
import { buildPosterImageUrl } from '@tvseri.es/utils';

import { getAllListItems } from '@/lib/db/list';
import { getSeriesPrefsMany } from '@/lib/db/prefs';
import { readShowItems } from '@/lib/rollups';
import { getSeriesFacts } from '@/lib/seriesFacts';
import { progressAt } from '@/lib/seriesFacts/aired';
import { TMDB_CONCURRENCY } from '@/lib/upstream/budget';
import { mapSettled } from '@/utils/limit';

// The in-progress shows scanned (their per-show summaries), most recently
// added first
const MAX_SHOWS = 30;

type Hole = Readonly<{ season: number; episode: number }>;

/**
 * The viewer's holes in one show: its open episodes (aired, neither watched
 * nor skipped: `progressAt`, the shared rule) that sit before the last
 * regular episode watched.
 */
export const getShowHoles = (
  watched: ReadonlyArray<
    Readonly<{ seasonNumber: number; episodeNumber: number }>
  >,
  facts: Parameters<typeof progressAt>[0],
  skipped: ReadonlySet<string>,
  now: number,
): Hole[] => {
  const regular = watched.filter((item) => item.seasonNumber > 0);
  if (regular.length === 0) {
    return [];
  }
  const lastSeason = Math.max(...regular.map((item) => item.seasonNumber));
  const lastEpisode = Math.max(
    ...regular
      .filter((item) => item.seasonNumber === lastSeason)
      .map((item) => item.episodeNumber),
  );
  const { open } = progressAt(
    facts,
    {
      skipped: [...skipped],
      watched: regular.map((item) => episodeCode(item)),
    },
    now,
  );
  return open
    .filter(
      (ref) =>
        ref.seasonNumber < lastSeason ||
        (ref.seasonNumber === lastSeason && ref.episodeNumber < lastEpisode),
    )
    .map((ref) => ({ episode: ref.episodeNumber, season: ref.seasonNumber }));
};

/**
 * The Season ledger: holes in the viewer's in-progress shows. A finished
 * show has none by definition (every aired episode is watched), so the
 * WATCHED list is not scanned.
 */
export const getLedger = async (
  userId: string,
  now: number,
): Promise<Ledger> => {
  const inProgress = (
    await getAllListItems({
      listId: 'IN_PROGRESS',
      sortDirection: 'desc',
      userId,
    })
  ).slice(0, MAX_SHOWS);

  const ids = inProgress.map((item) => item.id);
  // The shows' watched items from their summaries in one batch read
  const [facts, prefs, watched] = await Promise.all([
    getSeriesFacts(ids),
    getSeriesPrefsMany(userId, ids),
    readShowItems(userId, ids),
  ]);

  const shows = await mapSettled(
    inProgress,
    async (item): Promise<LedgerShow | undefined> => {
      const show = facts.get(item.id);
      if (!show) return undefined;
      const holes = getShowHoles(
        watched.get(item.id) ?? [],
        show,
        new Set(prefs.get(item.id)?.skipped ?? []),
        now,
      );
      if (holes.length === 0) return undefined;

      const perSeason = new Map<number, number>();
      for (const hole of holes) {
        perSeason.set(hole.season, (perSeason.get(hole.season) ?? 0) + 1);
      }
      return {
        episodes: holes.map((hole) =>
          episodeCode({
            episodeNumber: hole.episode,
            seasonNumber: hole.season,
          }),
        ),
        missingCount: holes.length,
        posterImage: show.posterPath
          ? buildPosterImageUrl(show.posterPath)
          : '',
        seasonCount: show.seasons.length,
        seasons: [...perSeason].map(([season, missing]) => ({
          missing,
          season,
        })),
        seriesId: item.id,
        slug: show.slug,
        title: show.title,
      };
    },
    TMDB_CONCURRENCY,
  );

  return {
    shows: shows.sort(
      (a, b) =>
        b.missingCount - a.missingCount || a.title.localeCompare(b.title),
    ),
  };
};
