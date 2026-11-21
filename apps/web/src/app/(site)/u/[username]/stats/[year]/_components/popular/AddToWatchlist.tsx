'use client';

import { memo } from 'react';

import PosterCircle, {
  watchlistGlyph,
} from '@/components/ui/button/PosterCircle';
import { STATS_POSTER_CIRCLE } from '@/components/ui/button/posterCircleLooks';
import IconSwap from '@/components/ui/icon/IconSwap';
import { useListToggle } from '@/lib/marking/toggles';

/**
 * The `+` on a Popular unwatched poster: the viewer's own
 * watchlist through the marking core (optimistic, toast with Undo, the
 * sign-in toast when signed out). The cached page ships it neutral; the
 * viewer's state arrives with the library ids after hydration.
 */
function AddToWatchlist({
  seriesId,
  title,
}: Readonly<{ seriesId: number; title: string }>) {
  const { isOn, toggle } = useListToggle(seriesId, 'watchlist');
  const label = isOn
    ? `Remove ${title} from watchlist`
    : `Add ${title} to watchlist`;
  const glyph = watchlistGlyph(isOn);
  return (
    <PosterCircle
      isOn={isOn}
      label={label}
      look={STATS_POSTER_CIRCLE}
      onClick={toggle}
    >
      <IconSwap glyph={glyph} size={16} />
    </PosterCircle>
  );
}

const Memo = memo(AddToWatchlist);
Memo.displayName = 'AddToWatchlist';
export default Memo;
