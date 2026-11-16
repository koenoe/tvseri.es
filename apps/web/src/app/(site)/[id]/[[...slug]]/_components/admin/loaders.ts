import 'server-only';

import type { SeriesImages } from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from '@/lib/api/client';

/**
 * `GET /series/:id/images?language=`: the picker's choices, the automatic
 * pair and the saved pick. Tagged with the show, so a save refreshes it.
 */
export async function loadSeriesImages(
  id: number,
  language: string | undefined,
): Promise<SeriesImages | null> {
  'use cache';
  cacheLife('short');
  cacheTag(`series:${id}`);
  return apiFetch<SeriesImages>('/series/:id/images', {
    notFound: 'null',
    params: { id },
    query: {
      language: language && /^[a-z]{2}$/.test(language) ? language : undefined,
    },
  });
}

/**
 * The page colour a backdrop gives (`GET /dominant-color`, the w780 image, as
 * the API detects it for the series object). Not cached here: the API caches
 * a detected colour forever and never caches its fallback.
 */
export async function loadBackdropColour(path: string): Promise<string> {
  const { hex } = await apiFetch<Readonly<{ hex: string }>>('/dominant-color', {
    query: { url: `https://image.tmdb.org/t/p/w780${path}` },
  });
  return hex;
}
