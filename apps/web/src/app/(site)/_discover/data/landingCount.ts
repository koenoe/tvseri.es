import 'server-only';

import type { LandingType } from '@tvseri.es/constants';
import { cacheLife, cacheTag } from 'next/cache';

import { isUnavailable, type Unavailable } from '@/lib/cache/unavailable';

import { getLandingFacts } from './facts';

/**
 * A landing's show count (its facts' `count`, cached `medium`), null for a
 * slug the API doesn't know, `Unavailable` when the API can't answer (then
 * cached for seconds, so the prerender leaves it out and it regenerates).
 */
export async function getLandingCount(
  type: LandingType,
  slug: string,
): Promise<number | null | Unavailable> {
  'use cache';
  cacheTag(`landing:${type}:${slug}`);
  const facts = await getLandingFacts(type, slug);
  if (isUnavailable(facts)) {
    cacheLife('unavailable');
    return facts;
  }
  cacheLife('medium');
  return facts?.count ?? null;
}
