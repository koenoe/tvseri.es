import 'server-only';

import type { RemoteEpisode } from '@/components/remote/types';
import { isUnavailable } from '@/lib/cache/unavailable';
import { nextEpisode } from '@/lib/marking/progress';
import { seedToBase } from '@/lib/marking/state';
import type { SeriesSeed } from '@/lib/marking/types';

import { loadSeasonEpisodes } from './loaders';

/**
 * The big key's titles and stills (the Remote): the viewer's Next up season
 * only, trimmed to `{ seasonNumber, episodeNumber, title, still }`. Read from
 * the wall's cached season (`loadSeasonEpisodes`), which is mostly the same
 * season, so the page asks the API for it once. Empty when nothing is up
 * next or the read failed.
 */
export async function loadRemoteEpisodes(
  seed: SeriesSeed,
): Promise<ReadonlyArray<RemoteEpisode>> {
  const next = nextEpisode(seedToBase(seed));
  if (!next) {
    return [];
  }
  const season = await loadSeasonEpisodes(seed.seriesId, next.seasonNumber);
  if (!season || isUnavailable(season)) {
    return [];
  }
  return season.episodes.map((episode) => ({
    episodeNumber: episode.episodeNumber,
    seasonNumber: episode.seasonNumber,
    still: episode.stillImage || null,
    title: episode.title,
  }));
}
