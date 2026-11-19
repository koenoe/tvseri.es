import 'server-only';

import type { Calendar } from '@tvseri.es/schemas';

import auth from '@/auth';
import { apiFetch } from '@/lib/api/client';
import { resolveRegion } from '@/lib/geo';

import { type Profile, withToken } from '../../_data/profile';

/**
 * Your calendar: `GET /me/calendar`, every dated episode of your shows for
 * twelve months and the renewed shows with no date, with your region for
 * the tickets' services (as the overview). It is the viewer's own data, so
 * only your own profile may read it: the callers check `viewer` first.
 * Private and computed per request, so never `use cache`; the API client
 * memoises the GET, so the page and its sidebar share one read.
 */
export async function loadCalendar(profile: Profile): Promise<Calendar> {
  if (profile.viewer !== 'owner') {
    throw new Error('The calendar is the owner’s own');
  }
  const region = await resolveRegion((await auth()).user);
  return apiFetch<Calendar>('/me/calendar', {
    ...withToken(profile),
    query: { region },
  });
}
