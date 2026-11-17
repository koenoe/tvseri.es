import GuardedSection from '@/components/ui/row/GuardedSection';
import Row from '@/components/ui/row/Row';
import RowError from '@/components/ui/row/RowError';
import RowSkeleton from '@/components/ui/row/RowSkeleton';
import RankedTile from '@/components/ui/tile/RankedTile';
import WatchedOverlay from '@/components/ui/tile/WatchedOverlay';
import { isUnavailable } from '@/lib/cache/unavailable';
import { getAllTimeFavourites } from '../_data/rows';

const ID = 'all-time-favourites';
const TITLE = 'All-time favourites';

async function RankedRow() {
  const shows = await getAllTimeFavourites();
  if (isUnavailable(shows)) {
    return (
      <RowError
        id={ID}
        look="hubRanked"
        state="unavailable"
        tiles="ranked"
        title={TITLE}
      />
    );
  }
  // under three posters the row steps aside (`rankedShows`)
  if (shows.length === 0) {
    return null;
  }
  return (
    <Row id={ID} look="hubRanked" name={ID} tiles="ranked" title={TITLE}>
      {shows.map((show) => (
        <RankedTile
          id={show.id}
          key={show.id}
          overlay={<WatchedOverlay id={show.id} />}
          poster={show.poster}
          rank={show.rank}
          slug={show.slug}
          title={show.title}
        />
      ))}
    </Row>
  );
}

/**
 * The owner's MDBList list as the page's one numbered row (a numbered top
 * 10, at 20 here): outlined numerals behind the posters, no filter and no
 * caption. Below the fold, so every poster loads lazily.
 */
export default function AllTimeFavourites() {
  const skeleton = (
    <RowSkeleton
      id={ID}
      look="hubRanked"
      name={ID}
      tiles="ranked"
      title={TITLE}
    />
  );
  return (
    <GuardedSection
      fallback={skeleton}
      id={ID}
      look="hubRanked"
      tiles="ranked"
      title={TITLE}
    >
      <RankedRow />
    </GuardedSection>
  );
}
