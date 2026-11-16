import 'server-only';

import { DURATION_TILES_VERSION } from '@tvseri.es/constants';
import type {
  DurationBucket,
  DurationPage,
  DurationShow,
  DurationTiles,
  FinishThisWeekend,
} from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import {
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';

/** A show as the Duration lens and Finish it this weekend draw it */
export type DurationTileShow = Readonly<{
  id: number;
  slug: string;
  title: string;
  poster: string | null;
  backdrop: string | null;
  year: number | null;
  episodes: number;
  /** total minutes; null when TMDB has no runtime */
  minutes: number | null;
  network: string | null;
}>;

export type DurationTileView = Readonly<{
  bucket: DurationBucket;
  count: number;
  exact: boolean;
  /** how many shows the tile's list holds: the hub offers it from `MIN_POSTERS` */
  listed: number;
  preview: ReadonlyArray<DurationTileShow>;
}>;

const toDurationTileShow = (show: DurationShow): DurationTileShow => ({
  backdrop: show.backdropImage || null,
  episodes: show.numberOfEpisodes,
  id: show.id,
  minutes: show.totalMinutes,
  network: show.network?.name ?? null,
  poster: show.posterImage || null,
  slug: show.slug,
  title: show.title,
  year: show.year,
});

/** The five Duration tiles (`GET /duration`), cached `medium` like the API */
export async function getDurationTiles(): Promise<
  ReadonlyArray<DurationTileView> | Unavailable
> {
  'use cache';
  cacheTag('duration');

  // the version steps past the CDN's week-long copy when the tiles change
  const response = await tryApi(() =>
    apiFetch<DurationTiles>('/duration', {
      query: { v: DURATION_TILES_VERSION },
    }),
  );
  if (isUnavailable(response)) {
    cacheLife('unavailable');
    return response;
  }
  cacheLife('medium');
  return response.tiles.map((tile) => ({
    bucket: tile.bucket,
    count: tile.count,
    exact: tile.exact,
    listed: tile.listed,
    preview: tile.preview.map(toDurationTileShow),
  }));
}

/** One page of a Duration tile's shows (`GET /duration/:bucket?page=`), `medium` */
export async function getDurationPage(
  bucket: DurationBucket,
  page = 1,
): Promise<
  | Readonly<{
      items: ReadonlyArray<DurationTileShow>;
      nextPage: number | null;
    }>
  | Unavailable
> {
  'use cache';
  cacheTag('duration');

  const response = await tryApi(() =>
    apiFetch<DurationPage>('/duration/:bucket', {
      params: { bucket },
      // the version steps past the CDN's week-long copy when the lists change
      query: {
        page: page > 1 ? page : undefined,
        v: DURATION_TILES_VERSION,
      },
    }),
  );
  if (isUnavailable(response)) {
    cacheLife('unavailable');
    return response;
  }
  cacheLife('medium');
  return {
    items: response.items.map(toDurationTileShow),
    nextPage: response.nextPage,
  };
}

/** Finish it this weekend (`GET /duration/weekend`), `medium` */
export async function getFinishThisWeekend(): Promise<
  ReadonlyArray<DurationTileShow> | Unavailable
> {
  'use cache';
  cacheTag('duration');

  const response = await tryApi(() =>
    apiFetch<FinishThisWeekend>('/duration/weekend'),
  );
  if (isUnavailable(response)) {
    cacheLife('unavailable');
    return response;
  }
  cacheLife('medium');
  return response.items.map(toDurationTileShow);
}
