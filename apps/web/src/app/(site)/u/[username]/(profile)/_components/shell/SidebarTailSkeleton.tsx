import type { ReactNode } from 'react';

import OwnerVisitor from '@/components/ui/viewer/OwnerVisitor';
import { StartSomethingNewSkeleton } from '../sidebar/StartSomethingNew';
import { WatchlistBlockSkeleton } from '../sidebar/WatchlistBlock';
import { YearSoFarSkeleton } from '../sidebar/YearSoFar';
import { NOT_ON_PHONE, ONLY_ON_PHONE } from './overviewLayout';

/**
 * The sidebar's last blocks (`@tail`): under the sidebar on a desktop
 * (its column's second row, 40px apart), at the end of the page below it.
 * A tablet flows them into two columns of about the sidebar's width (the
 * margin under the last one taken back); a phone stacks them 32px apart,
 * 32px under the page too (the frame's 20px row gap and 12px).
 */
export const SIDEBAR_TAIL_CLASS =
  'flex min-w-0 flex-col gap-10 max-md:mt-3 max-md:gap-8 md:max-lg:-mb-10 md:max-lg:block md:max-lg:columns-2 md:max-lg:gap-x-10 md:max-lg:*:mb-10 md:max-lg:*:break-inside-avoid md:max-lg:[&>:is(.ph-owner,.ph-visitor)>*]:mb-10 md:max-lg:[&>:is(.ph-owner,.ph-visitor)>*]:break-inside-avoid lg:col-start-1 lg:row-start-2';

/** A block's ghost in its block's box, named as its hole names it */
function Ghost({
  children,
  name,
}: Readonly<{ children: ReactNode; name: string }>) {
  return <div data-placeholder={name}>{children}</div>;
}

/**
 * The sidebar's last blocks before the profile resolves, at their real
 * size. Both variants are in the shell and one shows before the first
 * paint (`OwnerVisitor`): yours (Watchlist on a phone, Start something
 * new wider; this year) or someone else's (Watchlist, their year).
 */
export default function SidebarTailSkeleton() {
  return (
    <div className={SIDEBAR_TAIL_CLASS} data-placeholder="profile-tail">
      <OwnerVisitor
        owner={
          <>
            <div className={ONLY_ON_PHONE}>
              <Ghost name="watchlist">
                <WatchlistBlockSkeleton />
              </Ghost>
            </div>
            <div className={NOT_ON_PHONE}>
              <Ghost name="start-something-new">
                <StartSomethingNewSkeleton />
              </Ghost>
            </div>
            <Ghost name="this-year-so-far">
              <YearSoFarSkeleton />
            </Ghost>
          </>
        }
        visitor={
          <>
            <Ghost name="watchlist">
              <WatchlistBlockSkeleton />
            </Ghost>
            <Ghost name="this-year-so-far">
              <YearSoFarSkeleton />
            </Ghost>
          </>
        }
      />
    </div>
  );
}
