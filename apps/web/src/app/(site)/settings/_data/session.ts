import 'server-only';

import type { User } from '@tvseri.es/schemas';
import { unauthorized } from 'next/navigation';
import { cache } from 'react';

import auth from '@/auth';
import { missingUser } from '@/auth/missingUser';
import { getViewer, type Viewer } from '@/auth/viewer';

export type SettingsSession = Readonly<{
  accessToken: string;
  user: User;
}>;

/**
 * The signed-in viewer for every settings hole: `auth()` (read-only in RSC;
 * the proxy has already refreshed the session), the 401 page signed out, or
 * the section's error when the account can't be read (`missingUser`). Settings
 * are per user, so this is only ever called inside a Suspense hole, never in
 * the static frame. Memoised per request: the hero, the nav lines and the
 * section all share one `GET /me`.
 */
export const getSettingsSession = cache(async (): Promise<SettingsSession> => {
  const { accessToken, user } = await auth();
  if (!user || !accessToken) {
    if ((await missingUser()) === 'failed') {
      throw new Error('[settings] the account could not be read');
    }
    unauthorized();
  }
  return { accessToken, user };
});

/**
 * The verified viewer alone (id and token from the access token, no
 * `GET /me`), for the reads that need nothing else: the counts and the Plex
 * status start beside the account read instead of after it. Signed out is
 * the 401, as with `getSettingsSession`. Memoised per request.
 */
export const getSettingsViewer = cache(async (): Promise<Viewer> => {
  const viewer = await getViewer();
  if (!viewer) {
    unauthorized();
  }
  return viewer;
});
