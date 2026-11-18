'use client';

import type { UpNextItem } from '@tvseri.es/schemas';
import { memo } from 'react';
import RowRemote from '@/components/remote/RowRemote';
import UpNextFacts from '@/components/up-next/UpNextFacts';
import UpNextItemCard, {
  type UpNextArt,
} from '@/components/up-next/UpNextItemCard';
import { ownerFacts } from '@/components/up-next/upNextCopy';
import useUpNextTitle from '@/lib/marking/useUpNextTitle';
import episodePath from '@/lib/routing/episodePath';
import showPath from '@/lib/routing/showPath';

import { CONTINUE_REMOTE } from './continueLayout';

type Props = Readonly<{
  item: UpNextItem;
  now: number;
  /** the show's art (backdrop, logo); null when it failed */
  show: UpNextArt | null;
}>;

/**
 * Continue watching's Up next card: the
 * shared card with the ⋯ Remote top right, as the profile's Up next. The
 * whole card opens the episode. Memoised: Continue watching re-renders
 * whenever any show in the marking store changes (a hover seeds one), and
 * the tile's item stays the same object until its own show moves on.
 */
function UpNextTile({ item: liveItem, now, show }: Props) {
  const item = useUpNextTitle(liveItem);
  const href = episodePath(
    showPath(item.seriesId, item.slug),
    item.season,
    item.episode,
  );
  const factLines = ownerFacts(item, now);
  const facts = <UpNextFacts facts={factLines} />;
  const action = (
    <RowRemote
      className={CONTINUE_REMOTE}
      iconSize={22}
      season={item.season}
      seriesId={item.seriesId}
      slug={item.slug}
      title={item.title}
    />
  );
  return (
    <UpNextItemCard
      actions={action}
      art={show}
      facts={facts}
      href={href}
      item={item}
      now={now}
    />
  );
}

const MemoUpNextTile = memo(UpNextTile);
MemoUpNextTile.displayName = 'UpNextTile';

export default MemoUpNextTile;
