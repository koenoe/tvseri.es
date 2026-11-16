import 'server-only';

import type { WatchProvider } from '@tvseri.es/schemas';
import { cacheLife } from 'next/cache';

import { apiFetch } from '@/lib/api/client';

/**
 * Deliberately separate from Get started's own read of
 * `/discover/watch-providers` (no colours, uncached): different data and
 * cache needs.
 *
 * The services a region lists, in TMDB's display order, with their colours
 * (the viewer's saved services keep the colour the show page reads). Public
 * data, never the viewer's: cached per region on the `medium` profile.
 */
export async function loadRegionProviders(
  region: string,
): Promise<ReadonlyArray<WatchProvider>> {
  'use cache';
  cacheLife('medium');
  return apiFetch<WatchProvider[]>('/discover/watch-providers', {
    query: { include_colors: true, region },
  });
}
