import 'server-only';

import type { Overview, WaitingFor } from '@tvseri.es/schemas';

import auth from '@/auth';
import { ApiError, apiFetch } from '@/lib/api/client';
import { resolveRegion } from '@/lib/geo';

import { type Profile, withToken } from './profile';

/**
 * The tracker and calendar blocks: `GET /me/overview` for your own
 * profile, `GET /user/:id/overview` for someone else's (signed-in
 * viewers). Computed per request by the API, so it is fetched once per
 * render (the API client memoises GETs) and only inside Suspense holes.
 * Your own sends your region (saved country, else where you are): the
 * tickets' services follow it, as on every other page.
 */
export async function loadOverview(profile: Profile): Promise<Overview> {
  if (profile.viewer !== 'owner') {
    return apiFetch<Overview>('/user/:id/overview', {
      ...withToken(profile),
      params: { id: profile.user.id },
    });
  }
  const region = await resolveRegion((await auth()).user);
  return apiFetch<Overview>('/me/overview', {
    ...withToken(profile),
    query: { region },
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
