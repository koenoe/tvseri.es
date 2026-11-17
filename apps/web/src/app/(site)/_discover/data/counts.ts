import 'server-only';

import type { LandingType } from '@tvseri.es/constants';
import type { LandingCounts } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import { tags } from '@/lib/cache/tags';
import {
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';

/**
 * Every show of each landing (`GET /discover/landing/:type/counts?slugs=`,
 * the same number as the facts' `count`), cached `medium` like the API.
 * Pass the slugs sorted and comma-joined (`landingCountsKey`): one cache
 * entry and one API CDN key per list. Unknown slugs are left out.
 */
export async function getLandingCounts(
  type: LandingType,
  slugs: string,
): Promise<Readonly<Record<string, number>> | Unavailable> {
  'use cache';
  cacheTag(tags.landingCounts(type));

  if (!slugs) {
    cacheLife('medium');
    return {};
  }
  const response = await tryApi(() =>
    apiFetch<LandingCounts>('/discover/landing/:type/counts', {
      params: { type },
      query: { slugs },
    }),
  );
  if (isUnavailable(response)) {
    cacheLife('unavailable');
    return response;
  }
  // An answer that misses a slug (the API was a build behind) is kept briefly
  const complete = slugs
    .split(',')
    .every((slug) => response.counts[slug] !== undefined);
  if (complete) {
    cacheLife('medium');
  } else {
    cacheLife('short');
  }
  return response.counts;
}

/** The canonical `slugs` value: deduped, sorted, comma-joined */
export const landingCountsKey = (slugs: ReadonlyArray<string>): string =>
  [...new Set(slugs)].sort().join(',');
