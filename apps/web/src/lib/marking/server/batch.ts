import type {
  CreateWatchedItemBatch,
  DeleteWatchedItemBatch,
  Episode,
  EpisodeRef,
  MarkWhen,
  RestoreWhen,
  TvSeries,
  WatchProvider,
} from '@tvseri.es/schemas';
import { chunk as chunkBy } from '@tvseri.es/utils';

/** The API's batch routes take at most 50 items per request. */
const BATCH_SIZE = 50;

const MIN_WATCHED_AT = Date.UTC(2000, 0, 1);
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Local noon of an air date (`YYYY-MM-DD`, stored as UTC midnight), so the
 * stored instant shows the release day in the viewer's time zone.
 * `tzOffsetMinutes` is `Date#getTimezoneOffset()`.
 * Falls back to `now` for a missing, future or pre-2000 date.
 */
export function releaseWatchedAt(
  airDate: string | undefined,
  tzOffsetMinutes: number,
  now: number,
): number {
  const match = airDate ? DATE_ONLY.exec(airDate) : null;
  if (!match) {
    return now;
  }
  const noon =
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12) +
    tzOffsetMinutes * 60_000;
  return noon < MIN_WATCHED_AT || noon > now ? now : noon;
}

export type Stamp = Readonly<{ watchedAt: number; dateUnknown?: true }>;

/** The record a mark writes for one episode. */
export function stampFor(
  when: MarkWhen | RestoreWhen,
  airDate: string | undefined,
  now: number,
): Stamp {
  switch (when.kind) {
    case 'restore':
      return when.dateUnknown
        ? { dateUnknown: true, watchedAt: when.watchedAt }
        : { watchedAt: when.watchedAt };
    case 'now':
      return { watchedAt: now };
    case 'date':
      return { watchedAt: when.watchedAt };
    case 'unknown':
      return { dateUnknown: true, watchedAt: now };
    case 'release':
      return {
        watchedAt: releaseWatchedAt(airDate, when.tzOffsetMinutes, now),
      };
  }
}

type SeriesFields = Pick<TvSeries, 'id' | 'posterPath' | 'slug' | 'title'>;

const toSeriesForWatched = (series: SeriesFields) => ({
  id: series.id,
  posterPath: series.posterPath ?? '',
  slug: series.slug,
  title: series.title,
});

export type EpisodeLookup = (ref: EpisodeRef) => Episode | undefined;

/**
 * Batch items for `POST /user/:id/watched/batch`. Episodes the lookup doesn't
 * know (not in TMDB's season) are left out: the API needs their metadata.
 * So is a mark of an episode that hasn't aired (`hasAired`), as the page
 * refuses it and the API's batch route doesn't check; a restore is exempt,
 * since it puts back a record the user had even when TMDB has since moved
 * the date. A restore keeps its own service, only when it is one of
 * `knownProviders` (a name alone can't be trusted to carry a logo), and its
 * import.
 */
export function toBatchItems(
  input: Readonly<{
    episodes: ReadonlyArray<
      EpisodeRef & Readonly<{ when: MarkWhen | RestoreWhen }>
    >;
    hasAired: (episode: Episode) => boolean;
    knownProviders: ReadonlyArray<WatchProvider>;
    lookup: EpisodeLookup;
    now: number;
    series: SeriesFields;
    userId: string;
    watchProvider: WatchProvider | null;
  }>,
): CreateWatchedItemBatch {
  const tvSeries = toSeriesForWatched(input.series);
  return input.episodes.flatMap((ref) => {
    const episode = input.lookup(ref);
    const { when } = ref;
    if (!episode || (when.kind !== 'restore' && !input.hasAired(episode))) {
      return [];
    }
    const stamp = stampFor(when, episode.airDate, input.now);
    const restore = when.kind === 'restore' ? when : null;
    return [
      {
        ...(stamp.dateUnknown ? { dateUnknown: true as const } : {}),
        ...(restore?.importId ? { importId: restore.importId } : {}),
        episode: {
          airDate: episode.airDate ?? '',
          episodeNumber: episode.episodeNumber,
          runtime: Math.min(Math.max(episode.runtime ?? 0, 0), 1440),
          seasonNumber: episode.seasonNumber,
          stillPath: episode.stillPath || null,
          title: episode.title ?? '',
        },
        tvSeries,
        userId: input.userId,
        watchedAt: stamp.watchedAt,
        watchProvider: restore
          ? (input.knownProviders.find(
              (provider) => provider.name === restore.source,
            ) ?? null)
          : input.watchProvider,
      },
    ];
  });
}

export function toDeleteItems(
  input: Readonly<{
    episodes: ReadonlyArray<EpisodeRef>;
    series: SeriesFields;
    userId: string;
  }>,
): DeleteWatchedItemBatch {
  const tvSeries = toSeriesForWatched(input.series);
  return input.episodes.map((ref) => ({
    episodeNumber: ref.episodeNumber,
    seasonNumber: ref.seasonNumber,
    tvSeries,
    userId: input.userId,
  }));
}

/** `items` in groups the API's batch routes take (`BATCH_SIZE` by default) */
export function chunk<T>(
  items: ReadonlyArray<T>,
  size = BATCH_SIZE,
): ReadonlyArray<ReadonlyArray<T>> {
  return chunkBy(items, size);
}

/**
 * The user's preferred provider among the show's providers in their region,
 * else the first one, else none.
 */
export function pickWatchProvider(
  providers: ReadonlyArray<WatchProvider>,
  preferred: ReadonlyArray<Pick<WatchProvider, 'id'>> | undefined,
): WatchProvider | null {
  for (const wanted of preferred ?? []) {
    const match = providers.find((provider) => provider.id === wanted.id);
    if (match) {
      return match;
    }
  }
  return providers[0] ?? null;
}
