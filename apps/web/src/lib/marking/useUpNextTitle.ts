'use client';

import type { UpNextItem } from '@tvseri.es/schemas';
import { useMemo } from 'react';

import useSeasonEpisodes from '@/lib/series/useSeasonEpisodes';

/**
 * An Up next item with its episode's title: the overview's, else (the item
 * moved on after a mark, or the overview had none) from the season's
 * episodes (`GET /api/series/:id/season/:n`, public and CDN-cached, shared
 * with the show page's cache). Until it lands the item draws without one.
 */
export default function useUpNextTitle<T extends UpNextItem | undefined>(
  item: T,
): T {
  const season = useSeasonEpisodes(
    item?.seriesId ?? 0,
    item && !item.episodeTitle ? item.season : null,
  );
  const title = season?.episodes.find(
    (episode) => episode.episodeNumber === item?.episode,
  )?.title;
  return useMemo(
    () =>
      item && !item.episodeTitle && title
        ? { ...item, episodeTitle: title }
        : item,
    [item, title],
  );
}
