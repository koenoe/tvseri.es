import { formatGrouped, plural } from '@tvseri.es/utils';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import profilePath from '@/lib/routing/profilePath';

import Hole from '../_components/blocks/Hole';
import SubpageHeader, {
  SUBPAGE_TITLE_ID,
} from '../_components/subpage/SubpageHeader';
import {
  getProfile,
  type ProfileParams,
  profileMetadata,
} from '../_data/profile';
import CalendarEmpty from './_components/CalendarEmpty';
import CalendarSkeleton from './_components/CalendarSkeleton';
import CalendarView from './_components/CalendarView';
import { CALENDAR_PAGE } from './_components/calendarStyles';
import NoDateYet from './_components/NoDateYet';
import { loadCalendar } from './_data/calendar';
import { calendarCounts } from './_lib/calendarModel';

type Props = Readonly<{ params: ProfileParams }>;

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return profileMetadata(params, (username) => `@${username}’s calendar`);
}

/**
 * Calendar: when your shows continue, a month at a time, and the renewed
 * shows that have no date yet under it. Yours only for now: on someone
 * else's profile it goes to their overview. The page streams in one hole
 * over its skeleton; `?month=` and `?day=` (the client's) open a month and
 * a day. The phone frame draws no header.
 */
export default function CalendarPage({ params }: Props) {
  return (
    <section aria-labelledby={SUBPAGE_TITLE_ID}>
      <Hole bare fallback={<CalendarSkeleton />} title="Calendar">
        <Calendar params={params} />
      </Hole>
    </section>
  );
}

/** "4 shows this month · 26 no date yet" */
function countLine(showsThisMonth: number, noDate: number): string {
  const parts = [
    showsThisMonth ? `${plural(showsThisMonth, 'show')} this month` : '',
    noDate ? `${formatGrouped(noDate)} no date yet` : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Nothing this month';
}

async function Calendar({ params }: Props) {
  const profile = await getProfile(params, 'calendar');
  if (profile.viewer !== 'owner') {
    redirect(profilePath(profile.user.username));
  }
  const { grid, noDateYet } = await loadCalendar(profile);
  const { noDate, nothing, showsThisMonth } = calendarCounts(grid, noDateYet);
  const count = nothing ? 'Nothing yet' : countLine(showsThisMonth, noDate);
  return (
    <div className={CALENDAR_PAGE} data-slot="calendar">
      <SubpageHeader className="max-md:hidden" count={count} title="Calendar" />
      {nothing ? (
        <CalendarEmpty username={profile.user.username} />
      ) : (
        <>
          <CalendarView data={grid} noDateYet={noDate} now={Date.now()} />
          {noDate > 0 ? (
            <NoDateYet count={noDate} noDateYet={noDateYet} />
          ) : null}
        </>
      )}
    </div>
  );
}
