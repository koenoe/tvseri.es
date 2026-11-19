import type { Profile } from '../../_data/profile';

import BlockError from '../blocks/BlockError';
import Hole from '../blocks/Hole';
import AlmostDone, { AlmostDoneSkeleton } from './AlmostDone';
import CatchingUp, { CatchingUpSkeleton } from './CatchingUp';
import ComingUp, { ComingUpSkeleton } from './ComingUp';
import Favourites, { FavouritesSkeleton } from './Favourites';
import FromYourCircle, { FromYourCircleSkeleton } from './FromYourCircle';
import GetStarted from './GetStarted';
import GetStartedGhost from './get-started/GetStartedGhost';
import OutNow, { OutNowSkeleton } from './OutNow';
import Paused, { PausedSkeleton } from './Paused';
import RecentlyWatched, { RecentlyWatchedSkeleton } from './RecentlyWatched';
import SeasonLedger, { SeasonLedgerSkeleton } from './SeasonLedger';
import UpNext, { UpNextSkeleton } from './UpNext';

/**
 * Your own profile (top to bottom): Get started while you
 * are new, Up next, two lanes (left: Almost done, Season ledger, Paused;
 * right: Out now, Catching up, Coming up), From your circle,
 * Favourites, Recently watched. The overview is fetched once per render
 * (`loadOverview`); every block streams in its own hole.
 */
export default function OwnerOverview({
  profile,
}: Readonly<{ profile: Profile }>) {
  return (
    <>
      {/* One hole: a new user's Get started arrives with Up next, so it
          never pushes the page down after the fact */}
      <Hole
        className="flex flex-col gap-12"
        fallback={<UpNextSkeleton title="Up next" />}
        title="Up next"
      >
        {/* its own failure: the profile's centred card over its ghost */}
        <BlockError fallback={<GetStartedGhost />} title="Get started">
          <GetStarted profile={profile} />
        </BlockError>
        <UpNext profile={profile} />
      </Hole>
      {/* two lanes from 1280px, where each is 416px; below that
          they stack, so a lane is never narrower than a phone's */}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5">
          <Hole fallback={<AlmostDoneSkeleton />} title="Almost done">
            <AlmostDone profile={profile} />
          </Hole>
          <Hole fallback={<SeasonLedgerSkeleton />} title="Season ledger">
            <SeasonLedger profile={profile} />
          </Hole>
          <Hole fallback={<PausedSkeleton />} title="Paused">
            <Paused profile={profile} />
          </Hole>
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <Hole fallback={<OutNowSkeleton />} title="Out now">
            <OutNow profile={profile} />
          </Hole>
          <Hole fallback={<CatchingUpSkeleton />} title="Catching up">
            <CatchingUp profile={profile} />
          </Hole>
          <Hole fallback={<ComingUpSkeleton />} title="Coming up">
            <ComingUp profile={profile} />
          </Hole>
        </div>
      </div>
      <Hole fallback={<FromYourCircleSkeleton />} title="From your circle">
        <FromYourCircle profile={profile} />
      </Hole>
      <Hole fallback={<FavouritesSkeleton />} title="Favourites">
        <Favourites profile={profile} />
      </Hole>
      <Hole fallback={<RecentlyWatchedSkeleton />} title="Recently watched">
        <RecentlyWatched profile={profile} />
      </Hole>
    </>
  );
}
