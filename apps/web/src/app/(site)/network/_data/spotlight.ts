import 'server-only';

import type { TvSeries } from '@tvseri.es/schemas';
import { cacheTag } from 'next/cache';

import { tags } from '@/lib/cache/tags';
import {
  cacheLifeFor,
  isUnavailable,
  type Unavailable,
} from '@/lib/cache/unavailable';
import { loadSeries } from '@/lib/series/loaders';

import {
  discoverQueryString,
  getDiscoverShows,
} from '../../_discover/data/discover';
import { genreNameById } from '../../_discover/data/genreNames';
import type { TileShow } from '../../_discover/data/tileShow';
import { formatSeasons } from '../../_discover/landing/format';
import { shortOverview, spotlightKicker } from './kicker';

/** The network's recommendation tile, trimmed to what it draws */
export type NetworkSpotlight = Readonly<{
  id: number;
  slug: string;
  title: string;
  backdrop: string | null;
  /** the show's title treatment (TMDB logo) */
  logo: string | null;
  kicker: string;
  year: number | null;
  /** "3 seasons", or "9 episodes" for one season */
  seasons: string | null;
  /** the first genre ("Drama") */
  genre: string | null;
  /** the overview, shortened to whole sentences */
  reason: string;
}>;

const RUNNING = '0';

const yearOf = (date: string | undefined) => {
  const year = Number.parseInt(date?.slice(0, 4) ?? '', 10);
  return Number.isNaN(year) ? null : year;
};

/**
 * The network's most popular show with a backdrop (the first when none has
 * one), running ones only with `status`: the same cached list as the
 * landing's "Still running" row. `undefined` without shows.
 */
async function mostPopular(
  networkId: number,
  status?: string,
): Promise<TileShow | undefined | Unavailable> {
  const shows = await getDiscoverShows(
    discoverQueryString({
      with_networks: String(networkId),
      ...(status ? { with_status: status } : {}),
    }),
  );
  if (isUnavailable(shows)) {
    return shows;
  }
  return shows.items.find((show) => show.backdrop) ?? shows.items[0];
}

/** The pick and its details (status, next episode, title treatment) */
async function readSpotlight(
  networkId: number,
): Promise<
  Readonly<{ pick: TileShow; series: TvSeries }> | null | Unavailable
> {
  const running = await mostPopular(networkId, RUNNING);
  const pick = running ?? (await mostPopular(networkId));
  if (!pick || isUnavailable(pick)) {
    return pick ?? null;
  }
  const series = await loadSeries(pick.id);
  if (!series || isUnavailable(series)) {
    return series;
  }
  return { pick, series };
}

/**
 * The hero tile: the network's most popular returning show (TMDB status
 * "Returning Series", `with_status=0`), with when it is back from its next
 * episode; the most popular show at all when nothing is running. Built from
 * the cached discover list and show (`loadSeries`, shared with the show
 * page); cached `short` itself (the date and popularity move daily). Null
 * without shows.
 */
export async function getNetworkSpotlight(
  networkId: number,
): Promise<NetworkSpotlight | null | Unavailable> {
  'use cache';
  cacheTag(tags.networkSpotlight(networkId));

  const read = await readSpotlight(networkId);
  cacheLifeFor('short', read);
  if (isUnavailable(read)) {
    return read;
  }
  if (!read) {
    return null;
  }
  const { pick, series } = read;
  const running =
    series.status === 'Returning Series' || series.status === 'In Production';
  const next = series.nextEpisodeToAir;
  const genreId = series.genres[0]?.id;

  return {
    backdrop: series.backdropImage || pick.backdrop,
    genre:
      (genreId === undefined ? undefined : genreNameById(genreId)) ??
      series.genres[0]?.name ??
      null,
    id: series.id,
    kicker: spotlightKicker(
      {
        lastYear: yearOf(series.lastAirDate),
        next: next
          ? {
              airDate: next.airDate,
              episodeNumber: next.episodeNumber,
              firstEpisodeNumber: series.seasons?.find(
                (season) => season.seasonNumber === next.seasonNumber,
              )?.firstEpisodeNumber,
            }
          : null,
        running,
      },
      new Date(),
    ),
    logo: series.titleTreatmentImage || null,
    reason: shortOverview(series.description),
    seasons: formatSeasons(series.numberOfSeasons, series.numberOfEpisodes),
    slug: series.slug,
    title: series.title,
    year: yearOf(series.firstAirDate),
  };
}
