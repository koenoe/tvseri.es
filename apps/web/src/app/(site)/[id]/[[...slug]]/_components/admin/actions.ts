'use server';

import {
  PositiveIdSchema,
  type PreferredImages,
  SavePreferredImagesInputSchema,
} from '@tvseri.es/schemas';
import { updateTag } from 'next/cache';
import * as v from 'valibot';

import { getViewer } from '@/auth/viewer';
import { type ActionResult, actionError, okResult } from '@/lib/actions/result';
import { apiFetch } from '@/lib/api/client';
import { tags } from '@/lib/cache/tags';

/**
 * The admin image picker's writes (its reads are GET routes,
 * `/api/admin/series/:id/*`). Each one checks the admin role from the
 * verified token, validates its input, goes to `PUT|DELETE
 * /admin/preferred-images/series/:id` with the admin's token and refreshes
 * the show's cached data (and Home, whose spotlight uses the same
 * series object) at once. The API starts the CDN purge without waiting for
 * it, so a refresh that reaches a CDN location before the purge can cache
 * the old images for their cache life: an accepted race. Failures come back
 * as results, never thrown, so the tray can show the error toast and keep
 * the pick.
 */

async function adminToken(): Promise<string | null> {
  const viewer = await getViewer();
  return viewer?.role === 'admin' ? viewer.accessToken : null;
}

function refresh(seriesId: number) {
  updateTag(tags.series(seriesId));
  updateTag(tags.home);
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
  if (!v.is(PositiveIdSchema, seriesId)) {
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
