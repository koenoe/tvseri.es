import { type ReactNode, Suspense } from 'react';

import Page from '@/components/background/Page';
import OwnerVisitorSync from '@/components/ui/viewer/OwnerVisitorSync';

import IdentityError from './_components/shell/IdentityError';
import IdentitySkeleton, {
  CompactIdentitySkeleton,
  FullIdentitySkeleton,
} from './_components/shell/IdentitySkeleton';
import {
  OVERVIEW_GRID,
  OVERVIEW_MAIN,
} from './_components/shell/overviewLayout';
import ProfileIdentity from './_components/shell/ProfileIdentity';
import ProfileTabs from './_components/shell/ProfileTabs';
import SidebarFrame from './_components/shell/SidebarFrame';
import { PROFILE_GROUP_CLASS } from './_components/shell/subpage';
import TabsSkeleton from './_components/shell/TabsSkeleton';
import type { ProfileParams } from './_data/profile';

/**
 * The sidebar from `lg` (below 1024 a 300px sidebar left the content
 * ~370px); below it the phone's shell, the identity on
 * top. Its sub-pages on a phone: the compact identity sits
 * 16px above the tabs, and the page 16px under them (`SubpageMarker`)
 */
const GRID = `${PROFILE_GROUP_CLASS} mx-auto grid w-full max-w-page items-start gap-12 px-gutter lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16 lg:pt-[35px] max-lg:has-[[data-subpage]:not([style*=display])]:gap-4 ${OVERVIEW_GRID}`;
const MAIN = `flex min-w-0 flex-col gap-12 max-lg:group-has-[[data-subpage]:not([style*=display])]/profile:gap-4 ${OVERVIEW_MAIN}`;

/**
 * Every profile page but Stats: the sticky 300px
 * sidebar and the main column with the tab bar. The sidebar is the identity
 * (in this layout, so it stays mounted across tabs) and the `@aside` slot
 * under it: the overview's blocks, or a sub-page's navigator. The frame and
 * its skeletons are the static shell; who is looking at whose profile
 * streams in (signed out: the 401 page). A failed profile read
 * fails the identity and the blocks that need it, each in its own box; the
 * tabs still link every page. The `@tail` slot is the overview's last
 * blocks, after the main column (`overviewLayout.ts`).
 */
export default function ProfileLayout({
  aside,
  children,
  params,
  tail,
}: Readonly<{
  aside: ReactNode;
  children: ReactNode;
  params: ProfileParams;
  tail: ReactNode;
}>) {
  const fullGhost = <FullIdentitySkeleton />;
  const compactGhost = <CompactIdentitySkeleton />;
  return (
    <Page>
      {/* renders nothing: no space to hold, it waits for the URL's params */}
      <Suspense fallback={null}>
        <OwnerVisitorSync />
      </Suspense>
      <div className={GRID}>
        <SidebarFrame>
          <IdentityError compact={compactGhost} full={fullGhost}>
            <Suspense fallback={<IdentitySkeleton />}>
              <ProfileIdentity params={params} />
            </Suspense>
          </IdentityError>
          {aside}
        </SidebarFrame>
        <div className={MAIN}>
          <Suspense fallback={<TabsSkeleton />}>
            <ProfileTabs params={params} />
          </Suspense>
          {children}
        </div>
        {tail}
      </div>
    </Page>
  );
}
