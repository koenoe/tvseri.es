'use server';

import {
  UpdateWatchProvidersForUserSchema,
  type WatchProvider,
} from '@tvseri.es/schemas';
import * as v from 'valibot';

import { getViewer } from '@/auth/viewer';
import { ApiError, apiFetch } from '@/lib/api/client';

export type ServicesResult = Readonly<{ ok: boolean }>;

/**
 * Save the viewer's streaming services (`PUT /me/watch-providers`, the whole
 * list). A server action, so the proxy refreshes the session first and the
 * token never reaches the browser.
 */
export async function saveServices(
  watchProviders: ReadonlyArray<WatchProvider>,
): Promise<ServicesResult> {
  const viewer = await getViewer();
  const body = v.safeParse(UpdateWatchProvidersForUserSchema, {
    watchProviders,
  });
  if (!viewer || !body.success) {
    return { ok: false };
  }
  try {
    await apiFetch('/me/watch-providers', {
      accessToken: viewer.accessToken,
      body: body.output,
      method: 'PUT',
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false };
    }
    throw error;
  }
}
