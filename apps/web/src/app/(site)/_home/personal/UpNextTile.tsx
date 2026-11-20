'use client';

import type { UpNextItem } from '@tvseri.es/schemas';
import { type MouseEvent, memo, useCallback } from 'react';
import RowRemote from '@/components/remote/RowRemote';
import UpNextFacts from '@/components/up-next/UpNextFacts';
import UpNextItemCard, {
  type UpNextArt,
} from '@/components/up-next/UpNextItemCard';
import { ownerFacts } from '@/components/up-next/upNextCopy';
import {
  drawnComplete,
  FINISHED_ART,
} from '@/components/up-next/useFinishHold';
import useUpNextTitle from '@/lib/marking/useUpNextTitle';
import { isPlainClick } from '@/lib/navigation/isPlainClick';
import { holdModalOrigin } from '@/lib/navigation/modalOrigin';
import episodePath from '@/lib/routing/episodePath';
import showPath from '@/lib/routing/showPath';
import { prefetchEpisode } from '@/lib/series/useEpisodeData';

import { CONTINUE_REMOTE } from './continueLayout';

type Props = Readonly<{
  /** your mark finished the show: drawn complete, its art dimmed, a beat before the next (`useFinishHold`) */
  finishing: boolean;
  item: UpNextItem;
  now: number;
  /** the show's art (backdrop, logo); null when it failed */
  show: UpNextArt | null;
}>;

/**
 * Continue watching's Up next card: the
 * shared card with the ⋯ Remote top right, as the profile's Up next, with
 * its motion: the line slides as you mark, and a show your mark finished
 * holds a beat before the next (`useFinishHold`). The whole card opens the episode, as at once as a press can: pointing at it
 * warms the show's page (`TileLink`) and the episode's reads, and the modal
 * grows out of the card's own box, over the show page arriving underneath
 * (`modalOrigin.ts`). Memoised: Continue
 * watching re-renders whenever any show in the marking store changes (a
 * hover seeds one), and the tile's item stays the same object until its
 * own show moves on.
 */
function UpNextTile({ finishing, item: liveItem, now, show }: Props) {
  const titled = useUpNextTitle(liveItem);
  const item = finishing ? drawnComplete(titled) : titled;
  const artTone = finishing ? FINISHED_ART : undefined;
  const href = episodePath(
    showPath(item.seriesId, item.slug),
    item.season,
    item.episode,
  );
  const { episode: episodeNumber, season: seasonNumber, seriesId } = item;
  const warm = useCallback(
    () => prefetchEpisode(seriesId, { episodeNumber, seasonNumber }),
    [episodeNumber, seasonNumber, seriesId],
  );
  const holdOrigin = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.defaultPrevented || !isPlainClick(event)) {
        return;
      }
      const viewport = { height: window.innerHeight, width: window.innerWidth };
      const box = event.currentTarget.getBoundingClientRect();
      const episode = { episodeNumber, seasonNumber };
      holdModalOrigin(seriesId, episode, box, performance.now(), viewport);
    },
    [episodeNumber, seasonNumber, seriesId],
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
      backdropClassName={artTone}
      facts={facts}
      href={href}
      item={item}
      now={now}
      onClick={holdOrigin}
      onIntent={warm}
      slide
    />
  );
}

const MemoUpNextTile = memo(UpNextTile);
MemoUpNextTile.displayName = 'UpNextTile';

export default MemoUpNextTile;
