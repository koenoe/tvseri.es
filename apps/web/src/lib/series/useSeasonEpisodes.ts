'use client';

import type { ShowSeasonEpisodes } from './seasonEpisodes';
import useCachedJson, { primeJson, requestJson } from './useCachedJson';

/**
 * A season's episodes in the tab's JSON cache (`useCachedJson`), shared by
 * the wall, the history sheet, the episode modal and the Up next titles. The
 * server-rendered season is primed (`primeSeason`, no request); others load
 * once from `GET /api/series/:id/season/:n` (CDN-cached, public).
 */
const seasonUrl = (seriesId: number, seasonNumber: number) =>
  `/api/series/${seriesId}/season/${seasonNumber}`;

/** Seeds the cache with a server-rendered season (call during render, client only). */
export const primeSeason = (seriesId: number, season: ShowSeasonEpisodes) =>
  primeJson(seasonUrl(seriesId, season.seasonNumber), season);

/** Starts loading a season (no-op when loaded or loading). */
export const requestSeason = (seriesId: number, seasonNumber: number) =>
  requestJson(seasonUrl(seriesId, seasonNumber));

/**
 * A season's episodes: `undefined` while loading (it starts the load),
 * `null` when it failed. A primed season is drawn at once, hydration too.
 */
const useSeasonEpisodes = (seriesId: number, seasonNumber: number | null) =>
  useCachedJson<ShowSeasonEpisodes>(
    seasonNumber === null ? null : seasonUrl(seriesId, seasonNumber),
    true,
  );

export default useSeasonEpisodes;
