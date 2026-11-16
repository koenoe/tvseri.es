import 'server-only';

import type { SeriesSummaries } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import {
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';

/** What a meta line on a list of shows needs that a discover result lacks */
export type ShowSummary = Readonly<{
  /** The network TMDB lists first, null when none */
  network: string | null;
  seasons: number;
  episodes: number;
  /** Typical episode length × episodes; null when TMDB has no runtime */
  totalMinutes: number | null;
  year: number | null;
  /** TMDB status: Returning Series, Ended, Canceled... */
  status: string;
  /** The year it last aired ("finished in 2019"), null when unknown */
  lastAirYear: number | null;
}>;

/** The API takes 1 to 50 distinct ids per call */
const MAX_IDS = 50;

/**
 * `ids` as the cache key and the API wants them: distinct, sorted, comma
 * separated. Pass the result to `getShowSummaries`.
 */
export const summaryIds = (ids: ReadonlyArray<number>): string =>
  [...new Set(ids)].sort((a, b) => a - b).join(',');

const chunks = (ids: ReadonlyArray<string>) =>
  Array.from({ length: Math.ceil(ids.length / MAX_IDS) }, (_, index) =>
    ids.slice(index * MAX_IDS, (index + 1) * MAX_IDS),
  );

/**
 * Networks, seasons and lengths for a list of shows (`GET /series/summaries`,
 * cached `medium` like the API), keyed by id. A show TMDB doesn't know is
 * left out. Takes `summaryIds(ids)` so the key is one primitive.
 */
export async function getShowSummaries(
  ids: string,
): Promise<Readonly<Record<number, ShowSummary>> | Unavailable> {
  'use cache';
  cacheTag('series-summaries');

  const list = ids.split(',').filter(Boolean);
  const responses = await tryApi(() =>
    Promise.all(
      chunks(list).map((chunk) =>
        apiFetch<SeriesSummaries>('/series/summaries', {
          query: { ids: chunk.join(',') },
        }),
      ),
    ),
  );
  if (isUnavailable(responses)) {
    cacheLife('unavailable');
    return responses;
  }
  cacheLife('medium');
  const summaries: Record<number, ShowSummary> = {};
  for (const response of responses) {
    for (const summary of Object.values(response)) {
      if (summary) {
        summaries[summary.id] = {
          episodes: summary.numberOfEpisodes,
          // answers cached before the field existed lack it
          lastAirYear: summary.lastAirYear ?? null,
          network: summary.networks[0]?.name ?? null,
          seasons: summary.numberOfSeasons,
          status: summary.status,
          totalMinutes: summary.totalMinutes,
          year: summary.year,
        };
      }
    }
  }
  return summaries;
}
