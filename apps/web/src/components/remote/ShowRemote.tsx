'use client';

import type { CircleButtonSize } from '@/components/ui/button/buttonStyles';

import BigKey from './BigKey';
import ExtraSection from './ExtraSection';
import { smallKeys } from './keys';
import { useRemoteMarking } from './marking';
import type { RemotePlacement } from './place';
import Remote from './Remote';
import SmallKeys, { type HistoryAction } from './SmallKeys';
import type { NextToAir, RemoteEpisode, RemoteSection } from './types';

type KeysProps = HistoryAction &
  Readonly<{
    /** Titles and stills for the big key (the next-up season is enough). */
    episodes?: ReadonlyArray<RemoteEpisode>;
    /** `TvSeries.hasAired`: before that the big key is disabled (“Not aired yet”). */
    hasAired: boolean;
    /** The reason under a disabled big key (`TvSeries.nextEpisodeToAir`). */
    nextToAir?: NextToAir | null;
    seriesId: number;
  }>;

export type ShowRemoteProps = KeysProps &
  Readonly<{
    /** The Admin row, admins only: drawn after a rule, after E F W. */
    extraSection?: RemoteSection;
    className?: string;
    /** After the Remote closes */
    onClose?: () => void;
    /** Beside the ⋯ (the show page), or under it (a tile: the Library) */
    placement?: RemotePlacement;
    seriesName: string;
    /** The ⋯ circle: 48 in the show hero's action row. */
    size?: CircleButtonSize;
  }>;

const NO_EPISODES: ReadonlyArray<RemoteEpisode> = [];

function ShowKeys({
  episodes = NO_EPISODES,
  extraSection,
  hasAired,
  historyHref,
  nextToAir,
  onEditHistory,
  seriesId,
}: KeysProps & Readonly<{ extraSection?: RemoteSection }>) {
  const marking = useRemoteMarking(seriesId);
  const models = smallKeys('show', marking.status);
  return (
    <>
      <BigKey
        episodes={episodes}
        hasAired={hasAired}
        marking={marking}
        nextToAir={nextToAir}
        seriesId={seriesId}
      />
      <SmallKeys
        historyHref={historyHref}
        marking={marking}
        models={models}
        onEditHistory={onEditHistory}
      />
      {extraSection ? <ExtraSection section={extraSection} /> : null}
    </>
  );
}

/**
 * The show page's ⋯ and its Remote: Watched next
 * episode (N), Edit watch history (E), favourites (F), watchlist (W).
 *
 * @example
 * <ShowRemote seriesId={136315} seriesName="The Bear" hasAired historyHref={`${showPath(id, slug)}?history`} onEditHistory={openHistory} episodes={season} />
 */
export default function ShowRemote({
  className,
  onClose,
  placement = 'side',
  seriesName,
  size = 48,
  ...keys
}: ShowRemoteProps) {
  return (
    <Remote
      className={className}
      onClose={onClose}
      placement={placement}
      seriesName={seriesName}
      triggerSize={size}
    >
      <ShowKeys {...keys} />
    </Remote>
  );
}
