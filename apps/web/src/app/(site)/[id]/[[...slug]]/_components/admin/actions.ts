'use server';

import {
  BackdropColoursInputSchema,
  type PreferredImages,
  SavePreferredImagesInputSchema,
  type SeriesImages,
} from '@tvseri.es/schemas';
import { updateTag } from 'next/cache';
import * as v from 'valibot';

import { getViewer } from '@/auth/viewer';
import { type ActionResult, actionError, okResult } from '@/lib/actions/result';
import { apiFetch } from '@/lib/api/client';
import { isUnavailable } from '@/lib/cache/unavailable';
import { loadSeries } from '@/lib/series/loaders';

import { loadBackdropColour, loadSeriesImages } from './loaders';

/**
 * The admin image picker's server actions. Each one checks the
 * admin role from the verified token and validates its input; writes go to
 * `PUT|DELETE /admin/preferred-images/series/:id` with the admin's token and
 * refresh the show's cached data (and Home, whose spotlight uses the same
 * series object) at once. The API starts the CDN purge without waiting for
 * it, so a refresh that reaches a CDN location before the purge can cache
 * the old images for their cache life: an accepted race. Failures come back
 * as results, never thrown, so the tray can show the error toast and keep
 * the pick.
 */

const SeriesIdSchema = v.pipe(v.number(), v.integer(), v.minValue(1));

async function adminToken(): Promise<string | null> {
  const viewer = await getViewer();
  return viewer?.role === 'admin' ? viewer.accessToken : null;
}

function refresh(seriesId: number) {
  updateTag(`series:${seriesId}`);
  updateTag('home');
}

export async function loadAdminImages(
  seriesId: number,
): Promise<ActionResult<SeriesImages>> {
  if (!v.is(SeriesIdSchema, seriesId)) {
    return actionError('invalid');
  }
  if (!(await adminToken())) {
    return actionError('unauthenticated');
  }
  try {
    const series = await loadSeries(seriesId);
    if (isUnavailable(series)) {
      return actionError('failed');
    }
    const images =
      series && (await loadSeriesImages(seriesId, series.originalLanguage));
    return images ? okResult(images) : actionError('not-found');
  } catch (error) {
    console.error('[admin] [images] load failed', { error, seriesId });
    return actionError('failed');
  }
}

export async function loadBackdropColours(
  input: v.InferInput<typeof BackdropColoursInputSchema>,
): Promise<ActionResult<Readonly<Record<string, string>>>> {
  const parsed = v.safeParse(BackdropColoursInputSchema, input);
  if (!parsed.success) {
    return actionError('invalid');
  }
  if (!(await adminToken())) {
    return actionError('unauthenticated');
  }
  const settled = await Promise.allSettled(
    parsed.output.paths.map(
      async (path) => [path, await loadBackdropColour(path)] as const,
    ),
  );
  const colours = Object.fromEntries(
    settled.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    ),
  );
  return Object.keys(colours).length > 0
    ? okResult(colours)
    : actionError('failed');
}

export async function savePreferredImages(input: {
  preferred: PreferredImages;
  seriesId: number;
}): Promise<ActionResult> {
  const parsed = v.safeParse(SavePreferredImagesInputSchema, input);
  if (!parsed.success) {
    return actionError('invalid');
  }
  const accessToken = await adminToken();
  if (!accessToken) {
    return actionError('unauthenticated');
  }
  const { preferred, seriesId } = parsed.output;
  try {
    await apiFetch('/admin/preferred-images/series/:id', {
      accessToken,
      body: preferred,
      method: 'PUT',
      params: { id: seriesId },
    });
  } catch (error) {
    console.error('[admin] [images] save failed', { error, seriesId });
    return actionError('failed');
  }
  refresh(seriesId);
  return okResult(undefined);
}

export async function resetPreferredImages(
  seriesId: number,
): Promise<ActionResult> {
  if (!v.is(SeriesIdSchema, seriesId)) {
    return actionError('invalid');
  }
  const accessToken = await adminToken();
  if (!accessToken) {
    return actionError('unauthenticated');
  }
  try {
    await apiFetch('/admin/preferred-images/series/:id', {
      accessToken,
      method: 'DELETE',
      params: { id: seriesId },
    });
  } catch (error) {
    console.error('[admin] [images] reset failed', { error, seriesId });
    return actionError('failed');
  }
  refresh(seriesId);
  return okResult(undefined);
}
