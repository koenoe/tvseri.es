import { CACHE_LIFE } from '@tvseri.es/constants';
import type {
  BecauseYouWatched,
  Keyword,
  LibraryIds,
  MoreGenre,
  PickItem,
  TvSeries,
} from '@tvseri.es/schemas';
import { rotationIndex } from '@tvseri.es/utils';
import { readThrough, readThroughMany } from '@/lib/db/cache/readThrough';
import {
  fetchDiscoverTvSeries,
  fetchGenresForTvSeries,
  fetchTvSeriesBase,
  fetchTvSeriesForPicks,
} from '@/lib/tmdb';
import { isDrawablePick, withGenreNames } from './pickItems';

const MAX_ITEMS = 12;
const SHARED_TTL = 7 * 86400;
const GENRES_TTL = 30 * 86400;
const GENRE_SAMPLE = 8;
/** Shows whose genres are asked of TMDB at once */
const GENRES_CONCURRENCY = 8;

type Candidates = Readonly<{
  items: ReadonlyArray<PickItem>;
  /** The source show itself (the "If you liked" card draws its poster) */
  series: TvSeries;
  title: string;
}>;

/** Keywords that read badly as a reason ("Rape, like …") */
const UNFIT_KEYWORD =
  /\b(rape|sexual (abuse|assault)|child abuse|suicide|self[- ]harm)\b/i;

/** The show's first keyword that reads well in "<keyword>, like <show>" */
export const pickReasonKeyword = (
  keywords: ReadonlyArray<Keyword>,
): Keyword | undefined =>
  keywords.find((keyword) => !UNFIT_KEYWORD.test(keyword.name));

/**
 * What "Because you watched <show>" is made of, the same for every viewer
 * (so cached for 7 days in the Cache table): the show's recommendations plus
 * one discover by its top keyword and one by its network. 3 TMDB calls cold.
 */
const fetchCandidates = async (
  sourceId: number,
): Promise<Candidates | undefined> => {
  return readThrough<Candidates | undefined>(
    `home:because:v4:${sourceId}`,
    // An unknown show is not stored
    (candidates) => (candidates ? SHARED_TTL : false),
    async () => {
      const source = await fetchTvSeriesForPicks(sourceId);
      if (!source) {
        return undefined;
      }

      const keyword = pickReasonKeyword(source.keywords);
      const network = source.series.network;
      const [byKeyword, byNetwork, genres] = await Promise.all([
        keyword
          ? fetchDiscoverTvSeries({
              sort_by: 'vote_average.desc',
              'vote_count.gte': 300,
              with_keywords: String(keyword.id),
            })
          : undefined,
        network
          ? fetchDiscoverTvSeries({
              sort_by: 'vote_average.desc',
              'vote_count.gte': 300,
              with_networks: network.id,
            })
          : undefined,
        fetchGenresForTvSeries().catch(() => []),
      ]);
      const named = (series: TvSeries) => withGenreNames(series, genres);

      const lanes: ReadonlyArray<ReadonlyArray<PickItem>> = [
        (byKeyword?.items ?? []).map((series) => ({
          reason: { kind: 'keyword', label: keyword?.name ?? '' },
          series: named(series),
        })),
        (byNetwork?.items ?? []).map((series) => ({
          reason: { kind: 'network', label: network?.name ?? '' },
          series: named(series),
        })),
        source.recommendations.map((series) => ({
          reason: { kind: 'recommendation', label: '' },
          series: named(series),
        })),
      ];

      // Interleave the lanes so no single reason takes the row
      const items: PickItem[] = [];
      const seen = new Set<number>([sourceId]);
      for (let i = 0; i < 20; i++) {
        for (const lane of lanes) {
          const item = lane[i];
          if (
            item?.series.posterPath &&
            isDrawablePick(item) &&
            !seen.has(item.series.id)
          ) {
            seen.add(item.series.id);
            items.push(item);
          }
        }
      }

      const candidates = {
        items,
        series: named(source.series),
        title: source.series.title,
      };
      return candidates;
    },
  );
};

const inLibrary = (ids: LibraryIds) =>
  new Set([
    ...ids.favorites,
    ...ids.inProgress,
    ...ids.watched,
    ...ids.watchlist,
  ]);

/**
 * Picks one of the viewer's shows with a date-pure rotation and returns shows
 * like it that they have not got in any list.
 */
export const becauseYouWatched = async (
  ids: LibraryIds,
  date: string,
  { from, salt }: Readonly<{ from: 'favorite' | 'watched'; salt: string }>,
): Promise<BecauseYouWatched> => {
  const pool = from === 'favorite' ? ids.favorites : ids.watched;
  const sourceId = pool[rotationIndex(date, pool.length, salt)];
  if (sourceId === undefined) {
    return { items: [], source: null };
  }

  const candidates = await fetchCandidates(sourceId);
  if (!candidates) {
    return { items: [], source: null };
  }

  const owned = inLibrary(ids);
  return {
    items: candidates.items
      .filter((item) => !owned.has(item.series.id))
      .slice(0, MAX_ITEMS),
    source: {
      from,
      id: sourceId,
      series: candidates.series,
      title: candidates.title,
    },
  };
};

/** Genre ids per show, cached 30 days each: what a show is about doesn't move */
const genreIdsOf = async (
  ids: ReadonlyArray<number>,
): Promise<ReadonlyArray<ReadonlyArray<number>>> => {
  const genreIds = await readThroughMany<
    number,
    ReadonlyArray<number> | undefined
  >(ids, {
    concurrency: GENRES_CONCURRENCY,
    failures: 'tolerate',
    key: (id) => `home:genres:v1:${id}`,
    load: async (id) =>
      (await fetchTvSeriesBase(id))?.genres.map((genre) => genre.id),
    // A show TMDB doesn't know is asked again next time
    ttl: (value) => (value ? GENRES_TTL : false),
  });
  return ids.map((id) => genreIds.get(id) ?? []);
};

/**
 * A genre's most popular shows (one discover page), the same for everyone:
 * stored for a day, so More {genre} costs no TMDB call per view
 */
const discoverGenre = (genreId: number) =>
  readThrough(
    `discover-genre:v1:${genreId}`,
    CACHE_LIFE.short.sMaxAge,
    async () => {
      const { items } = await fetchDiscoverTvSeries({
        sort_by: 'popularity.desc',
        'vote_count.gte': 200,
        with_genres: String(genreId),
      });
      return { items };
    },
  );

/** The genre most of the watchlist leans to, and its best shows minus the library */
export const moreGenre = async (ids: LibraryIds): Promise<MoreGenre> => {
  const sample = ids.watchlist.slice(-GENRE_SAMPLE);
  const counts = new Map<number, number>();
  for (const genreIds of await genreIdsOf(sample)) {
    for (const genreId of genreIds) {
      counts.set(genreId, (counts.get(genreId) ?? 0) + 1);
    }
  }

  const [top] = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  if (!top) {
    return { genre: null, items: [], share: { matching: 0, sampled: 0 } };
  }

  const [genres, discovered] = await Promise.all([
    fetchGenresForTvSeries(),
    discoverGenre(top[0]),
  ]);

  const owned = inLibrary(ids);
  const items: ReadonlyArray<TvSeries> = discovered.items
    .filter(
      (series) =>
        !!series.posterPath && !!series.title.trim() && !owned.has(series.id),
    )
    .slice(0, MAX_ITEMS);

  return {
    genre: {
      id: top[0],
      name: genres.find((genre) => genre.id === top[0])?.name ?? '',
    },
    items,
    share: { matching: top[1], sampled: sample.length },
  };
};
