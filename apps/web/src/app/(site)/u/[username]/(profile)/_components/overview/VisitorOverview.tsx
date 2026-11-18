import type { Profile } from '../../_data/profile';
import Hole from '../blocks/Hole';
import AlsoWatching, { AlsoWatchingSkeleton } from '../visitor/AlsoWatching';
import BothWatch, { BothWatchSkeleton } from '../visitor/BothWatch';
import TasteSplit, { TasteSplitSkeleton } from '../visitor/TasteSplit';
import Favourites, { FavouritesSkeleton } from './Favourites';
import RecentlyWatched, { RecentlyWatchedSkeleton } from './RecentlyWatched';
import UpNext, { UpNextSkeleton } from './UpNext';

/**
 * Someone else's profile, read as a match: Watching now, then You both watch
 * beside Also watching and Where your tastes split, Favourites with a
 * relation pill each, Recently watched. The owner's lanes and From your
 * circle are not rendered.
 */
export default function VisitorOverview({
  profile,
}: Readonly<{ profile: Profile }>) {
  return (
    <>
      <Hole
        fallback={<UpNextSkeleton title="Watching now" />}
        title="Watching now"
      >
        <UpNext profile={profile} />
      </Hole>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5">
          <Hole fallback={<BothWatchSkeleton />} title="You both watch">
            <BothWatch profile={profile} />
          </Hole>
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <Hole fallback={<AlsoWatchingSkeleton />} title="Also watching">
            <AlsoWatching profile={profile} />
          </Hole>
          <Hole
            fallback={<TasteSplitSkeleton />}
            title="Where your tastes split"
          >
            <TasteSplit profile={profile} />
          </Hole>
        </div>
      </div>
      <Hole fallback={<FavouritesSkeleton />} title="Favourites">
        <Favourites profile={profile} />
      </Hole>
      <Hole fallback={<RecentlyWatchedSkeleton />} title="Recently watched">
        <RecentlyWatched profile={profile} />
      </Hole>
    </>
  );
}
