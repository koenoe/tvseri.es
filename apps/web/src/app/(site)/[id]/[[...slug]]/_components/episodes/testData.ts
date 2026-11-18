import type { SeriesBase, WatchRecord } from '@/lib/marking/types';

import type { ShowEpisode } from '@/lib/series/seasonEpisodes';

/**
 * Test helpers: a season of episodes and a marking view. The episodes'
 * own `hasAired` is false, so the view's aired count decides unless a test
 * sets it (a full-season drop).
 */
export function season(
  seasonNumber: number,
  count: number,
  runtimes: ReadonlyArray<number> = [],
): ReadonlyArray<ShowEpisode> {
  return Array.from({ length: count }, (_, index) => ({
    airDate: `2024-06-${String(1 + (index % 28)).padStart(2, '0')}`,
    description: `Overview ${index + 1}`,
    episodeNumber: index + 1,
    hasAired: false,
    id: seasonNumber * 1000 + index + 1,
    runtime: runtimes[index] ?? 30,
    seasonNumber,
    stillImage: '',
    title: `Episode ${index + 1}`,
  }));
}

export const record = (
  watchedAt: number,
  dateUnknown = false,
): WatchRecord => ({
  runtime: 30,
  watchedAt,
  ...(dateUnknown ? { dateUnknown: true as const } : {}),
});

export function view(
  overrides: Partial<SeriesBase> & Pick<SeriesBase, 'seasons'>,
): SeriesBase {
  return {
    prefs: null,
    seriesId: 1,
    skipped: [],
    status: null,
    watched: {},
    ...overrides,
  };
}
