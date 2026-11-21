'use client';

import type { EpisodeRef } from '@tvseri.es/schemas';
import { useEffect } from 'react';

import { useLoader } from '@/lib/lazy/useLoader';
import whenIdle from '@/lib/lazy/whenIdle';
import { prefetchEpisode } from '@/lib/series/useEpisodeData';
import { requestSeason } from '@/lib/series/useSeasonEpisodes';
import { useShow } from '../../_lib/ShowProvider';
import { closeEpisode, toNumberParam } from '../../_lib/urlState';
import useOpenedOnce from '../../_lib/useOpenedOnce';
import useShowQuery from '../../_lib/useShowQuery';
import { episodeModal, preloadEpisodeModal } from './episodeModalChunk';
import { isKnownEpisode } from './episodeSteps';

/** The show page's tiles warm the modal through the island */

const IDLE_PRELOAD = { fallbackDelay: 2000, timeout: 5000 } as const;

/**
 * The episode modal (`?season=N&episode=M`). Reads the URL only; the
 * modal loads on the first open and then stays mounted, so closing can play
 * its exit.
 */
export default function EpisodeModalIsland() {
  const show = useShow();
  const query = useShowQuery(show.id);
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
  const [EpisodeModal] = useLoader(episodeModal, askedKey);
  return opened && EpisodeModal ? <EpisodeModal episode={episode} /> : null;
}
