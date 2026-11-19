import 'server-only';

import type { Calendar } from '@tvseri.es/schemas';

import auth from '@/auth';
import { apiFetch } from '@/lib/api/client';
import { resolveRegion } from '@/lib/geo';

import { type Profile, withToken } from '../../_data/profile';
import type { CalendarData } from '../_lib/calendarModel';

export type LoadedCalendar = Readonly<{
  grid: CalendarData;
  noDateYet: Calendar['noDateYet'];
}>;

/**
 * The grid's part: an episode's number and code only. Its titles are never
 * drawn, and every month goes to the client (instant month switching), so
 * they would only weigh down the page's props.
 */
const gridOf = ({
  days,
  ...rest
}: Omit<Calendar, 'noDateYet'>): CalendarData => ({
  ...rest,
  days: days.map((day) => ({
    ...day,
    tickets: day.tickets.map((ticket) => ({
      ...ticket,
      episodes: ticket.episodes.map(({ code, episode }) => ({ code, episode })),
    })),
  })),
});

/**
 * Your calendar: `GET /me/calendar`, every dated episode of your shows for
 * twelve months and the renewed shows with no date, with your region for
 * the tickets' services (as the overview). It is the viewer's own data, so
 * only your own profile may read it: the callers check `viewer` first.
 * Private and computed per request, so never `use cache`; the API client
 * memoises the GET, so the page and its sidebar share one read.
 */
export async function loadCalendar(profile: Profile): Promise<LoadedCalendar> {
  if (profile.viewer !== 'owner') {
    throw new Error('The calendar is the owner’s own');
  }
  const region = await resolveRegion((await auth()).user);
  const { noDateYet, ...calendar } = await apiFetch<Calendar>('/me/calendar', {
    ...withToken(profile),
    query: { region },
  });
  return { grid: gridOf(calendar), noDateYet };
}
