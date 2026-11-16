'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';
import useCachedJson, { requestJson } from '../../_lib/useCachedJson';
import type { EpisodeModalCredits } from './episodeCredits';
import type { SeasonRatingsView } from './episodeRatings';

/**
 * The modal's two public reads (both CDN-cached route handlers, in the
 * tab's JSON cache): a season's IMDb ratings and an episode's credits.
 * ‹ › prefetches the neighbours so stepping never waits.
 */
const ratingsUrl = (seriesId: number, seasonNumber: number) =>
  `/api/series/${seriesId}/season/${seasonNumber}/ratings`;

const creditsUrl = (seriesId: number, ref: EpisodeRef) =>
  `/api/series/${seriesId}/season/${ref.seasonNumber}/episode/${ref.episodeNumber}`;

export const useSeasonRatings = (seriesId: number, seasonNumber: number) =>
  useCachedJson<SeasonRatingsView>(ratingsUrl(seriesId, seasonNumber));

export const useEpisodeCredits = (seriesId: number, ref: EpisodeRef) =>
  useCachedJson<EpisodeModalCredits>(creditsUrl(seriesId, ref));

/** Warms an episode's credits and its season's ratings (‹ › neighbours). */
export function prefetchEpisode(seriesId: number, ref: EpisodeRef) {
  requestJson(creditsUrl(seriesId, ref));
  requestJson(ratingsUrl(seriesId, ref.seasonNumber));
}
