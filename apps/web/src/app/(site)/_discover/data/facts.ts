import 'server-only';

import type { LandingType } from '@tvseri.es/constants';
import type { LandingFacts } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';
import {
  isUnavailable,
  tryApi,
  type Unavailable,
} from '@/lib/cache/unavailable';

/**
 * A landing's facts (count, chips, tabs, Originals, Made for), computed
 * by the API on read: a cold call is TMDB-heavy, so only ever call it here
 * (cached `medium`, like the API). Null for a slug the API doesn't know
 * (a real answer, cached `medium` too: the page calls `notFound()`).
 */
export async function getLandingFacts(
  type: LandingType,
  slug: string,
): Promise<LandingFacts | null | Unavailable> {
  'use cache';
  cacheTag(`landing:${type}:${slug}`);

  const facts = await tryApi(() =>
    apiFetch<LandingFacts>('/discover/landing/:type/:slug/facts', {
      notFound: 'null',
      params: { slug, type },
    }),
  );
  if (isUnavailable(facts)) {
    cacheLife('unavailable');
    return facts;
  }
  cacheLife('medium');
  return facts;
}
