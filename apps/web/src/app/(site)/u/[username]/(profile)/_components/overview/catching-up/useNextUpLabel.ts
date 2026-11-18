'use client';

import { parseEpisodeCode } from '@tvseri.es/schemas';

import useSeasonEpisodes from '@/lib/series/useSeasonEpisodes';

/**
 * "S01E11 The Long Night": the server's label (its code and the title Up
 * next had) while the run hasn't moved; once a mark moved it on, the new
 * code with its title from the season's episodes (`useSeasonEpisodes`, as
 * Up next's `useUpNextTitle`), the bare code until that lands.
 */
export default function useNextUpLabel(
  seriesId: number,
  live: string,
  server: Readonly<{ code: string; label: string }>,
): string {
  const moved = live === server.code ? null : parseEpisodeCode(live);
  const season = useSeasonEpisodes(seriesId, moved?.seasonNumber ?? null);
  if (!moved) {
    return server.label;
  }
  const title = season?.episodes.find(
    (episode) => episode.episodeNumber === moved.episodeNumber,
  )?.title;
  return title ? `${live} ${title}` : live;
}
