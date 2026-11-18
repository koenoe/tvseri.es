'use client';

import { LATE_FADE } from '@/components/motion/lateFade';
import WatchedLabel from '@/components/ui/tile/WatchedLabel';
import { useIsWatched } from '@/lib/marking/useWatched';

const BOX = `block ${LATE_FADE}`;

/**
 * The glass Watched label on a poster whose HTML is the same for everyone (a
 * cached row, a cached search result): put it in `PosterTile`'s `overlay`.
 * It comes from the viewer's library ids, loaded once per tab after
 * hydration (`useLibraryIds`: nothing signed out, nothing until they arrive,
 * kept current by every mark), so the cached page never varies per user. It
 * fades in (`LATE_FADE`) so the late arrival doesn't pop. It reads one
 * answer (`useIsWatched`), so a mark re-renders only the labels
 * it changes, not every tile on the page.
 */
export default function WatchedOverlay({ id }: Readonly<{ id: number }>) {
  const watched = useIsWatched(id);
  return watched ? (
    <span className={BOX}>
      <WatchedLabel />
    </span>
  ) : null;
}
