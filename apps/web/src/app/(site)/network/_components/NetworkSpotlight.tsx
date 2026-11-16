import {
  calendarGlyph,
  seasonGlyph,
  tagGlyph,
} from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { isUnavailable } from '@/lib/cache/unavailable';
import { loadSeriesStates } from '@/lib/marking/server/seriesStates';

import { Spotlight, SpotlightSkeleton } from '../../_discover/landing';
import { getNetworkSpotlight } from '../_data/spotlight';

/**
 * The network's recommendation tile: its most popular returning
 * show, "Returning Tue 17 Nov", year · seasons · genre, a short overview and
 * the Watchlist + Seen it control, in the viewer's state (its own read,
 * streamed). Nothing when the network has no shows.
 */
export default async function NetworkSpotlight({
  networkId,
}: Readonly<{ networkId: number }>) {
  const spot = await getNetworkSpotlight(networkId);
  if (isUnavailable(spot)) {
    return <SpotlightSkeleton look="failed" />;
  }
  if (!spot) {
    return null;
  }
  const meta = (
    <MetaRow>
      <MetaItem icon={calendarGlyph}>{spot.year ?? undefined}</MetaItem>
      <MetaItem icon={seasonGlyph}>{spot.seasons ?? undefined}</MetaItem>
      <MetaItem icon={tagGlyph}>{spot.genre ?? undefined}</MetaItem>
    </MetaRow>
  );
  const show = {
    backdrop: spot.backdrop,
    id: spot.id,
    logo: spot.logo,
    slug: spot.slug,
    title: spot.title,
  };
  return (
    <Spotlight
      kicker={spot.kicker}
      meta={meta}
      reason={spot.reason}
      seasons={spot.seasons}
      show={show}
      states={loadSeriesStates([spot.id])}
    />
  );
}
