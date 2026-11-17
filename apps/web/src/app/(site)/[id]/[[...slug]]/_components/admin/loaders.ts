import 'server-only';

import type { SeriesImages } from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';

/**
 * `GET /series/:id/images?language=`: the picker's choices, the automatic
 * pair and the saved pick. Not cached: only an admin opening the tray reads
 * it, and the tray must show what is stored now. A cached copy (a day,
 * tagged with the show) outlived a save on CI and under E2E_SLOW (the tray
 * reopened on Auto), and a pick stored or reset elsewhere never showed until
 * it expired.
 */
export async function loadSeriesImages(
  id: number,
  language: string | undefined,
): Promise<SeriesImages | null> {
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
