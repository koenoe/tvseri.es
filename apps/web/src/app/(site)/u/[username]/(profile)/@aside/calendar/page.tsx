import { Suspense } from 'react';

import { TextLine } from '@/components/ui/ghost/ghosts';
import cn from '@/lib/cn';

import BlockError from '../../_components/blocks/BlockError';
import PageKindMarker from '../../_components/shell/PageKindMarker';
import { SidebarRule } from '../../_components/shell/SidebarBlocksSkeleton';
import { getProfile, type ProfileParams } from '../../_data/profile';
import { MONTH_ROW } from '../../calendar/_components/calendarStyles';
import MonthsNav from '../../calendar/_components/MonthsNav';
import { loadCalendar } from '../../calendar/_data/calendar';
import { calendarCounts, datedMonths } from '../../calendar/_lib/calendarModel';

type Props = Readonly<{ params: ProfileParams }>;

const ROW_GHOST = cn(MONTH_ROW, 'animate-ghost');

/** The months before they land: the heading's box and four rows */
function MonthsGhost() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-0.5">
      <span className="px-2.5 pb-1.5">
        <TextLine className="text-overline" width="w-32" />
      </span>
      {Array.from({ length: 4 }, (_, index) => (
        <span className={ROW_GHOST} key={index}>
          <TextLine className="text-body-sm" width="w-20" />
          <TextLine className="text-caption" width="w-12" />
        </span>
      ))}
    </div>
  );
}

/**
 * The calendar's sidebar under the identity (from lg): a rule, then the
 * months that have dates and No date yet. Its months follow the grid's
 * (`?month=`). The page's own read, shared.
 */
export default function CalendarAside({ params }: Props) {
  return (
    <>
      <PageKindMarker kind="subpage" />
      <div className="-mt-4 flex flex-col gap-5 max-lg:hidden">
        <SidebarRule />
        <BlockError fallback={<MonthsGhost />} title="Months with dates">
          <Suspense fallback={<MonthsGhost />}>
            <Months params={params} />
          </Suspense>
        </BlockError>
      </div>
    </>
  );
}

async function Months({ params }: Props) {
  const profile = await getProfile(params);
  // a visitor's page goes to the overview; the calendar is yours only
  if (profile.viewer !== 'owner') {
    return null;
  }
  const { grid, noDateYet } = await loadCalendar(profile);
  const months = datedMonths(grid);
  const { noDate } = calendarCounts(grid, noDateYet);
  // nothing to list: also when this month's days have all gone, which the
  // page still draws
  if (months.length === 0 && noDate === 0) {
    return null;
  }
  return <MonthsNav months={months} noDateYet={noDate} today={grid.today} />;
}
