'use client';

import { LATE_FADE } from '@/components/motion/lateFade';
import WatchedLabel from '@/components/ui/tile/WatchedLabel';
import { useLibrarySelect } from '@/lib/marking/hooks';
import { librarySets } from '@/lib/marking/librarySets';

const BOX = `block ${LATE_FADE}`;

/**
 * The glass Watched label on a poster whose HTML is the same for everyone (a
 * cached row, a cached search result): put it in `PosterTile`'s `overlay`.
 * It comes from the viewer's library ids, loaded once per tab after
 * hydration (`useLibraryIds`: nothing signed out, nothing until they arrive,
 * kept current by every mark), so the cached page never varies per user. It
 * fades in (`LATE_FADE`) so the late arrival doesn't pop. The Watched
 * overlay of every poster tile: rows, Discover, landings and search. It
 * reads one answer (`useLibrarySelect`), so a mark re-renders only the
 * labels it changes, not every tile on the page.
 */
export default function WatchedOverlay({ id }: Readonly<{ id: number }>) {
  const watched = useLibrarySelect(
    (ids) => librarySets(ids).watched.has(id),
    false,
  );
  return watched ? (
    <span className={BOX}>
      <WatchedLabel />
    </span>
  ) : null;
}
