'use client';

import type { UpNextItem } from '@tvseri.es/schemas';
import { memo } from 'react';
import UpNextFacts from '@/components/up-next/UpNextFacts';
import UpNextItemCard, {
  type UpNextArt,
} from '@/components/up-next/UpNextItemCard';
import { ownerFacts } from '@/components/up-next/upNextCopy';
import useUpNextTitle from '@/lib/marking/useUpNextTitle';
import episodePath from '@/lib/routing/episodePath';
import showPath from '@/lib/routing/showPath';

import RemoteMenuButton from '../marking/RemoteMenuButton';
import MarkEye from './MarkEye';

type Props = Readonly<{
  item: UpNextItem;
  now: number;
  /** the show's art (backdrop, logo); null when it failed */
  show: UpNextArt | null;
}>;

/**
 * Continue watching's Up next card (phone `hx-mun`): the
 * shared card with Home's controls, the eye and ··· top right from md, the
 * eye at the end of the bar's episode line on a phone. The whole card opens
 * the episode. Memoised: Continue watching re-renders whenever any show in
 * the marking store changes (a hover seeds one), and the tile's item stays
 * the same object until its own show moves on.
 */
function UpNextTile({ item: liveItem, now, show }: Props) {
  const item = useUpNextTitle(liveItem);
  const showHref = showPath(item.seriesId, item.slug);
  const href = episodePath(showHref, item.season, item.episode);
  const historyHref = `${showHref}?season=${item.season}&history`;
  const eye = {
    code: item.code,
    episode: item.episode,
    episodeTitle: item.episodeTitle,
    season: item.season,
    seriesId: item.seriesId,
    title: item.title,
  };
  const facts = <UpNextFacts facts={ownerFacts(item, now)} />;
  const actions = (
    <span className="flex gap-2 max-md:hidden">
      <MarkEye {...eye} />
      <RemoteMenuButton
        historyHref={historyHref}
        seriesId={item.seriesId}
        title={item.title}
      />
    </span>
  );
  const phoneEye = <MarkEye className="md:hidden" {...eye} />;
  return (
    <UpNextItemCard
      actions={actions}
      art={show}
      episodeEnd={phoneEye}
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
