'use client';

import { useMemo } from 'react';

import useSeasonEpisodes from '@/lib/series/useSeasonEpisodes';

import type { EpisodeRef, RemoteEpisode } from './types';

const names = (episodes: ReadonlyArray<RemoteEpisode>, ref: EpisodeRef) =>
  episodes.some(
    (episode) =>
      episode.seasonNumber === ref.seasonNumber &&
      episode.episodeNumber === ref.episodeNumber,
  );

/**
 * The big key's episodes: what the opener passed, plus Next up's season
 * loaded by the Remote itself when the opener didn't pass it (Home's Up
 * next, a History row, a Library tile). One rule wherever the Remote
 * opens: the key shows the still and "S03E05 · Children".
 */
export function useEpisodeDetails(
  seriesId: number,
  next: EpisodeRef | null | undefined,
  given: ReadonlyArray<RemoteEpisode>,
): ReadonlyArray<RemoteEpisode> {
  const missing = next && !names(given, next) ? next.seasonNumber : null;
  const season = useSeasonEpisodes(seriesId, missing);
  return useMemo(
    () =>
      season
        ? [
            ...given,
            ...season.episodes.map((episode) => ({
              episodeNumber: episode.episodeNumber,
              seasonNumber: episode.seasonNumber,
              still: episode.stillImage || null,
              title: episode.title,
            })),
          ]
        : given,
    [given, season],
  );
}
