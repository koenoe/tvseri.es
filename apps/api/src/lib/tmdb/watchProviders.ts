import { CACHE_LIFE, WATCH_PROVIDER_PRIORITY } from '@tvseri.es/constants';
import type {
  TmdbTvSeriesWatchProviders,
  WatchProvider,
} from '@tvseri.es/schemas';
import { readThroughStale } from '@/lib/db/cache/readThroughStale';
import { refreshWaitMs } from '@/lib/deadline';
import { pathId, tmdbFetch } from '@/lib/tmdb/client';
import { toWatchProvider } from '@/lib/watchProviders';

/** A TMDB watch provider (a show's offer or the region's list) as served */
const fromTmdbProvider = (
  provider: Readonly<{
    logo_path: string;
    provider_id: number;
    provider_name: string;
  }>,
): WatchProvider =>
  toWatchProvider({
    id: provider.provider_id,
    logoPath: provider.logo_path,
    name: provider.provider_name,
  });

/**
 * A show's where-to-watch for every region, as TMDB gives it (only the
 * flat-rate, free and ad-supported offers we show), stored per show for a
 * day: the same for every viewer, so the profile's tickets, the
 * single-episode mark and the show page share one TMDB call per show a day.
 */
const watchProvidersOf = (id: number) =>
  readThroughStale<TmdbTvSeriesWatchProviders | null>(
    `tmdb-watch-providers:v3:${id}`,
    CACHE_LIFE.short.sMaxAge,
    // Kept a week to stand in; with a stored copy, a read waits on the
    // (low-priority) refresh only for what is left of its refresh wait
    7 * 24 * 60 * 60,
    async (): Promise<TmdbTvSeriesWatchProviders | null> => {
      const response = await tmdbFetch(`/3/tv/${id}/watch/providers`);
      if (!response) {
        return null;
      }
      const results = Object.fromEntries(
        Object.entries(response.results ?? {}).map(([region, offers]) => {
          const { ads, flatrate, free } = offers ?? {};
          return [region, { ads, flatrate, free }];
        }),
      );
      return { ...response, results };
    },
    { lowPriority: true, waitMs: refreshWaitMs },
  );

export async function fetchTvSeriesWatchProviders(
  id: number,
  region = 'US',
): Promise<WatchProvider[]> {
  const watchProviders = (await watchProvidersOf(id)) ?? undefined;

  const regionProviders = watchProviders?.results?.[region];
  const flatrate = regionProviders?.flatrate ?? [];
  // Free and ad-supported services are shown like subscription ones
  const offersOf = (kind: 'ads' | 'free') => {
    const offers = regionProviders?.[kind];
    return Array.isArray(offers) ? offers : [];
  };
  const providers = [...offersOf('free'), ...offersOf('ads'), ...flatrate];

  return providers
    .sort((a, b) => {
      const aPriority =
        WATCH_PROVIDER_PRIORITY[a.provider_name] ?? a.display_priority ?? 0;
      const bPriority =
        WATCH_PROVIDER_PRIORITY[b.provider_name] ?? b.display_priority ?? 0;
      return aPriority - bPriority;
    })
    .map(fromTmdbProvider);
}

export async function fetchTvSeriesWatchProvider(
  id: number | string,
  region = 'US',
): Promise<WatchProvider | null> {
  const watchProviders = await fetchTvSeriesWatchProviders(pathId(id), region);
  const watchProvider = watchProviders[0] ?? null;

  return watchProvider;
}

export async function fetchWatchProviders(
  region = 'US',
): Promise<WatchProvider[]> {
  const watchProviders = await tmdbFetch('/3/watch/providers/tv', {
    query: { watch_region: region },
  });

  return [...(watchProviders?.results ?? [])]
    .sort((a, b) => {
      const priorityA = a.display_priorities?.[region] ?? a.display_priority;
      const priorityB = b.display_priorities?.[region] ?? b.display_priority;
      return priorityA - priorityB;
    })
    .map(fromTmdbProvider);
}
