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
 * they would only weigh down the page's props. A visitor's tickets carry no
 * watchlist tag: it reads "On your watchlist", and with the owner's name in
 * it a long handle wraps the tag over three lines on a phone (30 characters
 * are allowed), so a visitor's shows go without it.
 */
const gridOf = (
  { days, shows, ...rest }: Omit<Calendar, 'noDateYet'>,
  owner: boolean,
): CalendarData => ({
  ...rest,
  days: days.map((day) => ({
    ...day,
    tickets: day.tickets.map((ticket) => ({
      ...ticket,
      episodes: ticket.episodes.map(({ code, episode }) => ({ code, episode })),
    })),
  })),
  shows: owner ? shows : shows.map((show) => ({ ...show, onWatchlist: false })),
});

/**
 * The profile owner's calendar: every dated episode of their shows for
 * twelve months and the renewed shows with no date. Yours is
 * `GET /me/calendar`, someone else's `GET /user/{id}/calendar`, keyed by
 * that owner's id. The tickets' services are the viewer's: the API takes
 * their saved country first, and `region` (where they are) without one; so
 * a visitor's page sends only the geo region and no `GET /me` waits in
 * front of the read. Private and computed per request, so never
 * `use cache`; the API client memoises the GET, so the page and its sidebar
 * share one read.
 */
export async function loadCalendar(profile: Profile): Promise<LoadedCalendar> {
  const { noDateYet, ...calendar } = await readCalendar(profile);
  return { grid: gridOf(calendar, profile.viewer === 'owner'), noDateYet };
}

async function readCalendar(profile: Profile): Promise<Calendar> {
  if (profile.viewer !== 'owner') {
    return apiFetch<Calendar>('/user/:id/calendar', {
      ...withToken(profile),
      params: { id: profile.user.id },
      query: { region: await resolveRegion() },
    });
  }
  const region = await resolveRegion((await auth()).user);
  return apiFetch<Calendar>('/me/calendar', {
    ...withToken(profile),
    query: { region },
  });
}
