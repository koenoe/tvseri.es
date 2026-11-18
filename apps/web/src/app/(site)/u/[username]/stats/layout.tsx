import { type ReactNode, Suspense } from 'react';

import Page from '@/components/background/Page';
import { BELOW_FLOATING_HEADER_LG } from '@/components/header/belowFloatingHeader';
import GuardedSection from '@/components/ui/row/GuardedSection';
import OwnerVisitorSync from '@/components/ui/viewer/OwnerVisitorSync';
import type { StatsHeadParams } from './_components/sidebar/head';
import PhoneHead, { PhoneHeadSkeleton } from './_components/sidebar/PhoneHead';
import StatsSidebar, {
  StatsSidebarSkeleton,
} from './_components/sidebar/StatsSidebar';

/**
 * The sticky 300px sidebar and the main column from `lg`; below it a short
 * identity header with the Years pills, then the same column. A user's
 * data-down page (`data-stats-down`, the user lookup unavailable) takes the
 * whole width: the grid steps aside.
 */
const GRID =
  'group/stats mx-auto w-full max-w-page items-start px-gutter pt-6 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16 lg:pt-[35px] has-[[data-stats-down]]:contents';
const SIDEBAR = `sticky top-8 hidden lg:block group-has-[[data-stats-down]]/stats:hidden ${BELOW_FLOATING_HEADER_LG}`;
const PHONE_HEAD = 'lg:hidden group-has-[[data-stats-down]]/stats:hidden';

/**
 * Every Stats year: the sidebar (desktop) and the phone head are about the
 * user, never the year, so they live here, above `[year]`: a year switch is
 * a soft navigation that keeps this layout, so they stay mounted (no
 * skeleton, no refetch) and only the year's content changes. The highlighted
 * year follows the URL in a client island (`YearLink`). Their skeletons show
 * on a page load only. Everything is cached per user (`loadStatsHead`), so
 * the layout reads no viewer.
 */
export default function StatsLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: StatsHeadParams }>) {
  return (
    <Page>
      {/* renders nothing: no space to hold, it waits for the URL's params */}
      <Suspense fallback={null}>
        <OwnerVisitorSync />
      </Suspense>
      <div className={GRID}>
        <aside aria-label="About this profile" className={SIDEBAR}>
          <GuardedSection
            fallback={<StatsSidebarSkeleton />}
            id="stats-sidebar"
            title="Years"
          >
            <StatsSidebar params={params} />
          </GuardedSection>
        </aside>
        <div className={PHONE_HEAD}>
          <GuardedSection
            fallback={<PhoneHeadSkeleton />}
            id="stats-phone-head"
            title="Years"
          >
            <PhoneHead params={params} />
          </GuardedSection>
        </div>
        {children}
      </div>
    </Page>
  );
}
