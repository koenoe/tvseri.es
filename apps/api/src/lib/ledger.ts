import { episodeCode, type Ledger, type LedgerShow } from '@tvseri.es/schemas';
import { buildPosterImageUrl } from '@tvseri.es/utils';

import { getAllListItems } from '@/lib/db/list';
import { getSeriesPrefsMany } from '@/lib/db/prefs';
import { readShowItems } from '@/lib/rollups';
import { getSeriesFacts } from '@/lib/seriesFacts';
import { airedEpisodesAt } from '@/lib/seriesFacts/aired';
import { TMDB_CONCURRENCY } from '@/lib/upstream/budget';
import { mapSettled } from '@/utils/limit';

// The in-progress shows scanned (their per-show summaries), most recently
// added first
const MAX_SHOWS = 30;

type Hole = Readonly<{ season: number; episode: number }>;

/**
 * Aired regular episodes the viewer has not watched, not skipped, that sit
 * before the last watched episode.
 */
const findHoles = (
  watched: ReadonlyArray<
    Readonly<{ seasonNumber: number; episodeNumber: number }>
  >,
  skipped: ReadonlySet<string>,
  airedBySeason: Readonly<Record<number, number>>,
): Hole[] => {
  const regular = watched.filter((item) => item.seasonNumber > 0);
  if (regular.length === 0) {
    return [];
  }
  const seen = new Set(regular.map((item) => episodeCode(item)));
  const lastSeason = Math.max(...regular.map((item) => item.seasonNumber));
  const lastEpisode = Math.max(
    ...regular
      .filter((item) => item.seasonNumber === lastSeason)
      .map((item) => item.episodeNumber),
  );

  const holes: Hole[] = [];
  for (const season of Object.keys(airedBySeason)
    .map(Number)
    .sort((a, b) => a - b)) {
    if (season > lastSeason) break;
    const upTo =
      season < lastSeason
        ? (airedBySeason[season] ?? 0)
        : Math.min(airedBySeason[season] ?? 0, lastEpisode - 1);
    for (let episode = 1; episode <= upTo; episode++) {
      const code = episodeCode({
        episodeNumber: episode,
        seasonNumber: season,
      });
      if (!seen.has(code) && !skipped.has(code)) {
        holes.push({ episode, season });
      }
    }
  }
  return holes;
};

/** The viewer's holes in one show, from its watched episodes, skips and facts */
export const getShowHoles = (
  watched: Parameters<typeof findHoles>[0],
  facts: Parameters<typeof airedEpisodesAt>[0],
  skipped: ReadonlySet<string>,
  now: number,
) => findHoles(watched, skipped, airedEpisodesAt(facts, now).bySeason);

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
