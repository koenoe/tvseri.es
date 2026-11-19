import 'server-only';

import type { Overview, WaitingFor } from '@tvseri.es/schemas';

import { ApiError, apiFetch } from '@/lib/api/client';

import { type Profile, withToken } from './profile';

/**
 * The tracker and calendar blocks: `GET /me/overview` for your own
 * profile, `GET /user/:id/overview` for someone else's (signed-in
 * viewers). Computed per request by the API, so it is fetched once per
 * render (the API client memoises GETs) and only inside Suspense holes.
 */
export function loadOverview(profile: Profile): Promise<Overview> {
  return profile.viewer === 'owner'
    ? apiFetch<Overview>('/me/overview', withToken(profile))
    : apiFetch<Overview>('/user/:id/overview', {
        ...withToken(profile),
        params: { id: profile.user.id },
      });
}

/**
 * The finished shows coming back (your own profile's Coming up: its Later
 * and No date yet rows): the full overview carries them, so the API doesn't
 * compute them twice.
 * An overview without it is a broken answer (only `?view=up-next` leaves it
 * out): the block's error boundary shows it.
 */
export async function loadWaitingFor(profile: Profile): Promise<WaitingFor> {
  const { waitingFor } = await loadOverview(profile);
  if (!waitingFor) {
    throw new ApiError(200, 'ApiInvalidResponse');
  }
  return waitingFor;
}
