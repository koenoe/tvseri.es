'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { createLoader } from '@/lib/lazy/createLoader';
import { useLoader } from '@/lib/lazy/useLoader';
import whenIdle from '@/lib/lazy/whenIdle';

import { useShow } from '../../_lib/ShowProvider';
import { closeEpisode, toNumberParam } from '../../_lib/urlState';
import useOpenedOnce from '../../_lib/useOpenedOnce';
import { requestSeason } from '../../_lib/useSeasonEpisodes';
import { isKnownEpisode } from './episodeSteps';
import { prefetchEpisode } from './useEpisodeData';

/**
 * The modal is its own chunk (a plain loader, not `next/dynamic`: a failed
 * chunk is tried again on the next open; ~18 KB gzip): it isn't part of the page's
 * first load, and is fetched once the browser is idle, so the first open
 * doesn't wait for it (measured: ~320ms cold vs ~20ms warm).
 */
const modal = createLoader(() =>
  import('./EpisodeModal').then((module) => module.default),
);

const IDLE_PRELOAD = { fallbackDelay: 2000, timeout: 5000 } as const;

/**
 * Starts loading the modal's chunk now (idle time, or a tile's pointerenter
 * or focus when that comes first). Tiles that open the modal
 * also carry `data-episode-tile="S03E05"` on the element the card grows from.
 */
export function preloadEpisodeModal() {
  modal.preload();
}

/**
 * The episode modal (`?season=N&episode=M`, EP-B). Reads the URL only; the
 * modal loads on the first open and then stays mounted, so closing can play
 * its exit.
 */
export default function EpisodeModalIsland() {
  const query = useSearchParams();
  const show = useShow();
  const seasonNumber = toNumberParam(query.get('season'));
  const episodeNumber = toNumberParam(query.get('episode'));
  const asked: EpisodeRef | null =
    seasonNumber !== null && episodeNumber !== null && episodeNumber > 0
      ? { episodeNumber, seasonNumber }
      : null;
  // An episode the show doesn't have opens nothing; the URL loses it below.
  const unknown = asked !== null && !isKnownEpisode(show.seasons, asked);
  const episode = unknown ? null : asked;
  useEffect(() => {
    if (unknown) {
      closeEpisode();
    }
  }, [unknown]);
  const opened = useOpenedOnce(episode !== null);
  // The episode's reads start with the modal's chunk, not once it has
  // loaded: a deep link otherwise waits for the chunk, then for the season
  const seriesId = show.id;
  const seasonToRead = episode?.seasonNumber;
  const episodeToRead = episode?.episodeNumber;
  useEffect(() => {
    if (seasonToRead === undefined || episodeToRead === undefined) {
      return;
    }
    requestSeason(seriesId, seasonToRead);
    prefetchEpisode(seriesId, {
      episodeNumber: episodeToRead,
      seasonNumber: seasonToRead,
    });
  }, [episodeToRead, seasonToRead, seriesId]);
  useEffect(() => whenIdle(preloadEpisodeModal, IDLE_PRELOAD), []);
  const askedKey = episode
    ? `${episode.seasonNumber}:${episode.episodeNumber}`
    : null;
  // a failed chunk leaves it closed; the next episode asked loads it again
  const [EpisodeModal] = useLoader(modal, askedKey);
  return opened && EpisodeModal ? <EpisodeModal episode={episode} /> : null;
}
