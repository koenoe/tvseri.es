import { MAX_EPISODES_PER_SERIES_MARK } from '@tvseri.es/constants';
import {
  type EpisodeForWatched,
  episodeCode,
  type Season,
  type TvSeries,
  type TvSeriesForWatched,
  type WatchedItem,
  type WatchProvider,
} from '@tvseri.es/schemas';
import { hasAiredAt } from '@tvseri.es/utils';

import {
  afterWatching,
  clearSkipped,
  clearSkippedCodes,
  getSeriesPrefs,
} from '@/lib/db/prefs';
import {
  deleteWatchedItems,
  getAllWatchedForTvSeries,
  getWatchedForSeason,
  putWatchedItems,
  type WatchedPut,
  type WatchedWhen,
} from '@/lib/db/watched';
import { syncListsForMark } from '@/lib/listSync';
import { seasonForMark, seriesForMark } from '@/lib/marking/catalog';
import { TMDB_CONCURRENCY } from '@/lib/upstream/budget';
import { createLimiter } from '@/utils/limit';

import {
  NoSeasonsError,
  SeasonNotAiredError,
  TooManyEpisodesError,
} from './errors';

/**
 * The watch log: every way a user's watches are recorded or erased. A write
 * is the watched items, then the prefs side and then, for a viewer waiting on
 * the next screen, the show's lists placed in the request (the watched
 * stream places them after every write anyway: lib/listSync/README.md).
 */

/** Who records the watches; it decides what follows the write (RULES) */
export type WatchSource = 'viewer' | 'restore' | 'import' | 'scrobble';

type Rule = Readonly<{
  /** The prefs side of the written episodes */
  prefs: (items: ReadonlyArray<WatchedItem>) => Promise<void>;
  /** Place the shows' lists in the request (syncListsForMark) */
  placeLists: boolean;
}>;

const RULES: Readonly<Record<WatchSource, Rule>> = {
  // An import or a service sync restores history too. Nobody waits on a
  // screen and a batch holds many shows: the stream places them
  import: { placeLists: false, prefs: clearSkipped },
  // Undo putting marks back restores history, it is no new watching: only
  // un-skips (a hidden show stays hidden). The viewer waits on the screen
  restore: { placeLists: true, prefs: clearSkipped },
  // New watching from a media server: no screen waits, the stream places it
  scrobble: { placeLists: false, prefs: afterWatching },
  // New watching: un-skips, and brings a hidden show back. Placed in the
  // request: the viewer's next screen shows the lists
  viewer: { placeLists: true, prefs: afterWatching },
};

/** One watched episode as its caller has it (the web, an import, TMDB) */
export type EpisodeMark = WatchedWhen &
  Readonly<{
    episode: EpisodeForWatched;
    importId?: string;
    tvSeries: TvSeriesForWatched;
    watchProvider?: WatchProvider | null;
  }>;

type RecordOptions =
  | Readonly<{ source: Exclude<WatchSource, 'import'> }>
  | Readonly<{
      source: 'import';
      /**
       * Which of the written episodes to un-skip, per show, for an import that
       * reads (and keeps) them itself: no prefs write for the rest
       */
      unskipped?: (
        items: ReadonlyArray<WatchedItem>,
      ) => Promise<ReadonlyMap<number, ReadonlySet<string>>>;
    }>;

/**
 * Records watched episodes as given (an episode twice once), never asking
 * TMDB: Undo puts back an episode TMDB no longer lists from the record alone.
 * Returns the written items.
 */
export const recordMarks = async (
  userId: string,
  marks: ReadonlyArray<EpisodeMark>,
  options: RecordOptions,
): Promise<WatchedItem[]> => {
  const items = await putWatchedItems(
    marks.map((mark) => ({ ...mark, userId })),
  );
  const rule = RULES[options.source];
  if (options.source === 'import' && options.unskipped) {
    await clearSkippedCodes(userId, await options.unskipped(items));
  } else {
    await rule.prefs(items);
  }
  if (rule.placeLists) {
    await syncListsForMark(
      userId,
      marks.map((mark) => mark.tvSeries.id),
    );
  }
  return items;
};

/** Where the scope's episodes were watched (none given: unknown) */
type Provider = WatchProvider | null | undefined;

/** A season (`seasonNumber`) or every regular season of a show */
export type Scope = Readonly<{
  seriesId: number;
  seasonNumber?: number;
}>;

/**
 * A viewer's season or whole-show mark: the aired episodes neither watched
 * nor skipped are written (a skip stays a skip until that episode itself is
 * marked). Returns the scope's watched items, the ones watched before
 * included; undefined when TMDB has no aired show. Throws
 * SeasonNotAiredError, NoSeasonsError or TooManyEpisodesError before
 * anything is written.
 */
export const recordScopeMark = async (
  userId: string,
  scope: Scope,
  {
    watchProvider,
    when,
  }: Readonly<{
    /** Looked up alongside the show when it's still pending */
    watchProvider: Provider | Promise<Provider>;
    when: WatchedWhen;
  }>,
): Promise<WatchedItem[] | undefined> => {
  const [tvSeries, provider, skipped] = await Promise.all([
    fetchAiredSeries(scope.seriesId),
    watchProvider,
    skippedFor(userId, scope.seriesId),
  ]);

  if (!tvSeries) {
    return undefined;
  }

  const input = { skipped, tvSeries, userId, watchProvider: provider, when };
  const items =
    scope.seasonNumber === undefined
      ? await markTvSeries(input)
      : await markSeason({ ...input, seasonNumber: scope.seasonNumber });
  // The scope's items, the ones watched before too: the season or show was
  // watched now, so a hidden show comes back even when nothing was new
  await RULES.viewer.prefs(items);
  await syncListsForMark(userId, [tvSeries.id], tvSeries);
  return items;
};

/** One episode to erase */
export type EpisodeRef = Readonly<{
  episodeNumber: number;
  seasonNumber: number;
  seriesId: number;
}>;

/**
 * A viewer's unmark: the episodes, or a scope's watched episodes (a whole
 * show's specials stay: they count nowhere a whole-show unmark is about, and
 * are unmarked one by one or by their season). The prefs stay as they are;
 * the shows are placed in the request. False when TMDB has no aired show for
 * a scope.
 */
export const eraseMarks = async (
  userId: string,
  target: Readonly<{ episodes: ReadonlyArray<EpisodeRef> }> | Scope,
): Promise<boolean> => {
  if ('episodes' in target) {
    await deleteWatchedItems(
      target.episodes.map((episode) => ({ ...episode, userId })),
    );
    await syncListsForMark(
      userId,
      target.episodes.map((episode) => episode.seriesId),
    );
    return true;
  }

  const { seasonNumber } = target;
  const tvSeries = await fetchAiredSeries(target.seriesId);
  if (!tvSeries) {
    return false;
  }
  const watched =
    seasonNumber === undefined
      ? (
          await getAllWatchedForTvSeries({
            attributes: ['episodeNumber', 'seasonNumber'],
            tvSeriesId: tvSeries.id,
            userId,
          })
        ).filter((item) => item.seasonNumber > 0)
      : (
          await getWatchedForSeason({
            attributes: ['episodeNumber'],
            seasonNumber,
            tvSeriesId: tvSeries.id,
            userId,
          })
        ).map((item) => ({ ...item, seasonNumber }));
  await deleteWatchedItems(
    watched.map((item) => ({
      episodeNumber: item.episodeNumber,
      seasonNumber: item.seasonNumber,
      seriesId: tvSeries.id,
      userId,
    })),
  );
  await syncListsForMark(userId, [tvSeries.id], tvSeries);
  return true;
};

// The show, when TMDB has it and it has started airing
const fetchAiredSeries = async (id: number) => {
  const tvSeries = await seriesForMark(id);
  return tvSeries?.firstAirDate && tvSeries.hasAired ? tvSeries : undefined;
};

/** Episode codes (`S01E02`) the viewer skipped: a scope mark leaves them */
type Skipped = ReadonlySet<string>;

// Read consistently, so a skip saved just before the press is seen
const skippedFor = async (userId: string, seriesId: number): Promise<Skipped> =>
  new Set<string>(
    (await getSeriesPrefs(userId, seriesId, { consistent: true })).skipped,
  );

type ScopeInput = Readonly<{
  skipped: Skipped;
  tvSeries: TvSeries;
  userId: string;
  watchProvider: Provider;
  when: WatchedWhen;
}>;

const fetchAiredSeason = async (
  tvSeriesId: number,
  seasonNumber: number,
): Promise<Season> => {
  const season = await seasonForMark(tvSeriesId, seasonNumber);

  if (
    !season?.numberOfAiredEpisodes ||
    !hasAiredAt(season.airDate, Date.now())
  ) {
    throw new SeasonNotAiredError(`Invalid season for ${tvSeriesId}`);
  }

  return season;
};

// The writes for a season's aired episodes that are neither watched nor skipped
const seasonPuts = ({
  existingWatched,
  season,
  seasonNumber,
  skipped,
  tvSeries,
  userId,
  watchProvider,
  when,
}: ScopeInput &
  Readonly<{
    existingWatched: ReadonlyArray<Pick<WatchedItem, 'episodeNumber'>>;
    season: Season;
    seasonNumber: number;
  }>): WatchedPut[] => {
  const existingEpisodeNumbers = new Set(
    existingWatched.map((item) => item.episodeNumber),
  );
  const now = Date.now();
  return season.episodes
    .filter(
      (episode) =>
        hasAiredAt(episode.airDate, now) &&
        !existingEpisodeNumbers.has(episode.episodeNumber) &&
        !skipped.has(
          episodeCode({ episodeNumber: episode.episodeNumber, seasonNumber }),
        ),
    )
    .map((episode) => ({
      dateUnknown: when.dateUnknown,
      episode: {
        airDate: episode.airDate,
        episodeNumber: episode.episodeNumber,
        runtime: episode.runtime,
        seasonNumber,
        stillPath: episode.stillPath,
        title: episode.title,
      },
      tvSeries,
      userId,
      watchedAt: when.watchedAt,
      watchProvider,
    }));
};

const markSeason = async (
  input: ScopeInput & Readonly<{ seasonNumber: number }>,
) => {
  const [season, existingWatched] = await Promise.all([
    fetchAiredSeason(input.tvSeries.id, input.seasonNumber),
    getWatchedForSeason({
      seasonNumber: input.seasonNumber,
      tvSeriesId: input.tvSeries.id,
      userId: input.userId,
    }),
  ]);

  const puts = seasonPuts({ ...input, existingWatched, season });
  if (puts.length === 0) {
    return existingWatched;
  }
  return [...existingWatched, ...(await putWatchedItems(puts))];
};

const markTvSeries = async (input: ScopeInput) => {
  const { tvSeries, userId } = input;
  if (!tvSeries.seasons) {
    throw new NoSeasonsError(`No seasons found for ${tvSeries.id}`);
  }

  // Too many writes for one request: the web marks season by season instead
  if (tvSeries.numberOfAiredEpisodes > MAX_EPISODES_PER_SERIES_MARK) {
    throw new TooManyEpisodesError(
      `Too many episodes to mark at once (${tvSeries.numberOfAiredEpisodes}); mark seasons one by one`,
    );
  }

  const now = Date.now();
  const seasons = tvSeries.seasons.filter(
    (season) => season.seasonNumber > 0 && hasAiredAt(season.airDate, now),
  );

  // Fetch and validate every season before writing anything, so an invalid
  // season fails the whole request without a partial write
  const limit = createLimiter(TMDB_CONCURRENCY);
  const [airedSeasons, existingWatched] = await Promise.all([
    Promise.all(
      seasons.map(({ seasonNumber }) =>
        limit(async () => ({
          season: await fetchAiredSeason(tvSeries.id, seasonNumber),
          seasonNumber,
        })),
      ),
    ),
    getAllWatchedForTvSeries({ tvSeriesId: tvSeries.id, userId }),
  ]);

  const perSeason = airedSeasons.map(({ season, seasonNumber }) => {
    const existingForSeason = existingWatched.filter(
      (item) => item.seasonNumber === seasonNumber,
    );
    return {
      existingForSeason,
      puts: seasonPuts({
        ...input,
        existingWatched: existingForSeason,
        season,
        seasonNumber,
      }),
    };
  });

  // Written in one go, answered season by season: the watched ones first
  const written = await putWatchedItems(perSeason.flatMap(({ puts }) => puts));
  let offset = 0;
  return perSeason.flatMap(({ existingForSeason, puts }) => {
    const newForSeason = written.slice(offset, offset + puts.length);
    offset += puts.length;
    return [...existingForSeason, ...newForSeason];
  });
};
