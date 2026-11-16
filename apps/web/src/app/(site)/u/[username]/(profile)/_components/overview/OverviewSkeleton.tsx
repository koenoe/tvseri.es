import type { ReactNode } from 'react';

import OwnerVisitor from '@/components/ui/viewer/OwnerVisitor';
import { AlsoWatchingSkeleton } from '../visitor/AlsoWatching';
import { BothWatchSkeleton } from '../visitor/BothWatch';
import { TasteSplitSkeleton } from '../visitor/TasteSplit';
import { AlmostDoneSkeleton } from './AlmostDone';
import { CatchingUpSkeleton } from './CatchingUp';
import { ComingUpSkeleton } from './ComingUp';
import { FavouritesSkeleton } from './Favourites';
import { FromYourCircleSkeleton } from './FromYourCircle';
import { OutNowSkeleton } from './OutNow';
import { PausedSkeleton } from './Paused';
import { RecentlyWatchedSkeleton } from './RecentlyWatched';
import { SeasonLedgerSkeleton } from './SeasonLedger';
import { UpNextSkeleton } from './UpNext';
import { WaitingForSkeleton } from './WaitingFor';

/**
 * The overview before the viewer is known: both variants' blocks in their
 * places, one shown before the first paint (`OwnerVisitor`), so the footer
 * and the page's length don't jump when the blocks stream in. Keep each in
 * step with `OwnerOverview` and `VisitorOverview`.
 */
export default function OverviewSkeleton() {
  return (
    <OwnerVisitor owner={<OwnerSkeleton />} visitor={<VisitorSkeleton />} />
  );
}

/** The block's box for the parity spec (`Hole` does the same once it streams) */
function Ph({
  children,
  name,
}: Readonly<{ children: ReactNode; name: string }>) {
  return <div data-placeholder={name}>{children}</div>;
}

function OwnerSkeleton() {
  return (
    <>
      <Ph name="up-next">
        <UpNextSkeleton title="Up next" />
      </Ph>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5">
          <Ph name="almost-done">
            <AlmostDoneSkeleton />
          </Ph>
          <Ph name="season-ledger">
            <SeasonLedgerSkeleton />
          </Ph>
          <Ph name="paused">
            <PausedSkeleton />
          </Ph>
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <Ph name="out-now">
            <OutNowSkeleton />
          </Ph>
          <Ph name="catching-up">
            <CatchingUpSkeleton />
          </Ph>
          <Ph name="coming-up">
            <ComingUpSkeleton />
          </Ph>
          <Ph name="waiting-for">
            <WaitingForSkeleton />
          </Ph>
        </div>
      </div>
      <Ph name="from-your-circle">
        <FromYourCircleSkeleton />
      </Ph>
      <Ph name="favourites">
        <FavouritesSkeleton />
      </Ph>
      <Ph name="recently-watched">
        <RecentlyWatchedSkeleton />
      </Ph>
    </>
  );
}

function VisitorSkeleton() {
  return (
    <>
      <Ph name="watching-now">
        <UpNextSkeleton title="Watching now" />
      </Ph>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5">
          <Ph name="you-both-watch">
            <BothWatchSkeleton />
          </Ph>
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <Ph name="also-watching">
            <AlsoWatchingSkeleton />
          </Ph>
          <Ph name="where-your-tastes-split">
            <TasteSplitSkeleton />
          </Ph>
        </div>
      </div>
      <Ph name="favourites">
        <FavouritesSkeleton />
      </Ph>
      <Ph name="recently-watched">
        <RecentlyWatchedSkeleton />
      </Ph>
    </>
  );
}
