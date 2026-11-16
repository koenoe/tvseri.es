'use client';

import { useEffect, useState } from 'react';

import type { EpisodeRef, RemoteEpisode } from './types';

/** A season's episodes as the big key draws them, per show and season. */
const seasons = new Map<string, Promise<ReadonlyArray<RemoteEpisode>>>();

type SeasonBody = Readonly<{
  episodes: ReadonlyArray<
    Readonly<{
      episodeNumber: number;
      seasonNumber: number;
      stillImage: string;
      title: string;
    }>
  >;
}>;

function loadSeason(
  seriesId: number,
  seasonNumber: number,
): Promise<ReadonlyArray<RemoteEpisode>> {
  const key = `${seriesId}:${seasonNumber}`;
  let request = seasons.get(key);
  if (!request) {
    // the show page's public, CDN-cached season read
    request = fetch(`/api/series/${seriesId}/season/${seasonNumber}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`season ${response.status}`);
        }
        const body = (await response.json()) as SeasonBody;
        return body.episodes.map((episode) => ({
          episodeNumber: episode.episodeNumber,
          seasonNumber: episode.seasonNumber,
          still: episode.stillImage || null,
          title: episode.title,
        }));
      })
      .catch(() => {
        seasons.delete(key);
        return [];
      });
    seasons.set(key, request);
  }
  return request;
}

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
  const [loaded, setLoaded] =
    useState<
      Readonly<{ season: number; episodes: ReadonlyArray<RemoteEpisode> }>
    >();
  useEffect(() => {
    if (missing === null) {
      return;
    }
    let live = true;
    void loadSeason(seriesId, missing).then((episodes) => {
      if (live) {
        setLoaded({ episodes, season: missing });
      }
    });
    return () => {
      live = false;
    };
  }, [missing, seriesId]);
  return missing !== null && loaded?.season === missing
    ? [...given, ...loaded.episodes]
    : given;
}
