import 'server-only';

import type { SeriesImages } from '@tvseri.es/schemas';
import { generateTmdbImageUrl } from '@tvseri.es/utils';

import { apiFetch } from '@/lib/api/client';
import { isUnavailable, type Unavailable } from '@/lib/cache/unavailable';
import { loadSeries } from '@/lib/series/loaders';

/**
 * The admin image picker's reads (`/api/admin/series/:id/*`): the show's
 * choices and the page colour of its backdrops. Admin-only, never cached.
 */

/**
 * `GET /series/:id/images?language=`: the picker's choices, the automatic
 * pair and the saved pick. Not cached: only an admin opening the tray reads
 * it, and the tray must show what is stored now. A cached copy (a day,
 * tagged with the show) outlived a save on CI and under E2E_SLOW (the tray
 * reopened on Auto), and a pick stored or reset elsewhere never showed until
 * it expired.
 */
async function loadSeriesImages(
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
async function loadBackdropColour(path: string): Promise<string> {
  const { hex } = await apiFetch<Readonly<{ hex: string }>>('/dominant-color', {
    query: { url: generateTmdbImageUrl(path, 'w780') },
  });
  return hex;
}

/**
 * The picker's choices for a show, in its original language: null when the
 * show or its images are unknown.
 */
export async function loadAdminImages(
  seriesId: number,
): Promise<SeriesImages | Unavailable | null> {
  const series = await loadSeries(seriesId);
  if (isUnavailable(series) || !series) {
    return series;
  }
  return loadSeriesImages(seriesId, series.originalLanguage);
}

/** The page colours of the backdrops that could be read; a failed one is left out. */
export async function loadBackdropColours(
  paths: ReadonlyArray<string>,
): Promise<Readonly<Record<string, string>>> {
  const settled = await Promise.allSettled(
    paths.map(async (path) => [path, await loadBackdropColour(path)] as const),
  );
  return Object.fromEntries(
    settled.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    ),
  );
}
