'use server';

import type { LastImport } from '@tvseri.es/schemas';
import * as v from 'valibot';
import { fetchMe } from '@/auth/me';
import { getViewer } from '@/auth/viewer';
import { ApiError, apiFetch } from '@/lib/api/client';
import { type ActionResult, actionError, okResult } from '@/lib/marking/result';
import { revalidateViewerStats } from '@/lib/stats/revalidateViewerStats';

/**
 * The importer's server actions. Each acts on the signed-in viewer's own
 * import: the API's paths are `/me/...`, so the access token decides whose,
 * and no user id ever comes from the browser.
 */

/** The API's import ids are UUIDs: anything else fails here, before a call. */
const ImportIdSchema = v.pipe(v.string(), v.uuid());

function failed(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return actionError('unauthenticated');
    }
    if (error.status === 409 || error.status === 400) {
      return actionError('invalid');
    }
    if (error.status === 404) {
      return actionError('not-found');
    }
  }
  console.error('[import]', error);
  return actionError('failed');
}

/** `POST /me/imports`: a new import, the user's last one. */
export async function startImport(): Promise<
  ActionResult<{ importId: string; createdAt: number }>
> {
  const viewer = await getViewer();
  if (!viewer) {
    return actionError('unauthenticated');
  }
  try {
    const created = await apiFetch<LastImport>('/me/imports', {
      accessToken: viewer.accessToken,
      method: 'POST',
    });
    return okResult({
      createdAt: created.createdAt,
      importId: created.importId,
    });
  } catch (error) {
    return failed(error);
  }
}

/**
 * `DELETE /me/imports/:importId`: Undo, queued. 409 (not the last import, or
 * already undone) is `invalid`. The viewer's stats refresh here, and again in
 * `importStatus` once the queued Undo is done.
 */
export async function undoImport(
  importId: string,
): Promise<ActionResult<{ requestedAt: number }>> {
  const parsed = v.safeParse(ImportIdSchema, importId);
  if (!parsed.success) {
    return actionError('invalid');
  }
  const viewer = await getViewer();
  if (!viewer) {
    return actionError('unauthenticated');
  }
  try {
    await apiFetch('/me/imports/:importId', {
      accessToken: viewer.accessToken,
      method: 'DELETE',
      params: { importId: parsed.output },
    });
    revalidateViewerStats(viewer.id);
    return okResult({ requestedAt: Date.now() });
  } catch (error) {
    return failed(error);
  }
}

/**
 * `GET /me`: the last import, for polling `undoneAt` after Undo. Only that
 * poll calls it, so an undone import refreshes the viewer's stats once.
 */
export async function importStatus(): Promise<
  ActionResult<{ lastImport: LastImport | null }>
> {
  const viewer = await getViewer();
  if (!viewer) {
    return actionError('unauthenticated');
  }
  try {
    const user = await fetchMe(viewer.accessToken);
    if (!user) {
      return actionError('unauthenticated');
    }
    if (user.lastImport?.undoneAt) {
      revalidateViewerStats(viewer.id);
    }
    return okResult({ lastImport: user.lastImport ?? null });
  } catch (error) {
    return failed(error);
  }
}
