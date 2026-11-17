'use server';

import { ImportIdSchema, type LastImport } from '@tvseri.es/schemas';
import * as v from 'valibot';
import { fetchMe } from '@/auth/me';
import { getViewer } from '@/auth/viewer';
import { apiFailure } from '@/lib/actions/apiFailure';
import { type ActionResult, actionError, okResult } from '@/lib/actions/result';
import { apiFetch } from '@/lib/api/client';
import { revalidateViewerStats } from '@/lib/stats/revalidateViewerStats';

/**
 * The importer's server actions. Each acts on the signed-in viewer's own
 * import: the API's paths are `/me/...`, so the access token decides whose,
 * and no user id ever comes from the browser.
 */

/** A 409 (not the last import, or already undone) or a 400 is `invalid` */
const STATUSES = { 400: 'invalid', 409: 'invalid' } as const;

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
    return apiFailure('import', error, STATUSES);
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
    return apiFailure('import', error, STATUSES);
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
    return apiFailure('import', error, STATUSES);
  }
}
