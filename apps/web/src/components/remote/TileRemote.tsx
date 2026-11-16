'use client';

import type { CircleButtonSize } from '@/components/ui/button/buttonStyles';
import type { IconSize } from '@/components/ui/icon/types';

import BigKey from './BigKey';
import { smallKeys } from './keys';
import { useRemoteMarking } from './marking';
import type { RemotePlacement } from './place';
import Remote from './Remote';
import SmallKeys from './SmallKeys';
import type { RemoteEpisode } from './types';

type KeysProps = Readonly<{
  /** Titles and stills for the big key: the tile's season. */
  episodes?: ReadonlyArray<RemoteEpisode>;
  /** Edit watch history: the show page's sheet on the tile's season. */
  historyHref: string;
  /** On a hidden show: H is latched and brings it back (the Library's Hidden shelf). */
  hidden?: boolean;
  /** After Hide (or Unhide on a hidden show): animate the tile out. */
  onHide?: () => void;
  seriesId: number;
}>;

export type TileRemoteProps = KeysProps &
  Readonly<{
    className?: string;
    /** The tile's colour (its backdrop colour): the keys mix from it. */
    ink?: string;
    seriesName: string;
    /** The ⋯ glyph, 20 by default; Home's Up next tile draws 22. */
    iconSize?: IconSize;
    /** The ⋯ circle: 32 on the tile. */
    size?: CircleButtonSize;
    /** Under the ⋯, right-aligned or growing right (a Library tile) */
    placement?: Extract<RemotePlacement, 'below' | 'below-start'>;
  }>;

const NO_EPISODES: ReadonlyArray<RemoteEpisode> = [];
const MODELS = smallKeys('tile', null);
const HIDDEN_MODELS = smallKeys('tile', null, { hidden: true });

function TileKeys({
  episodes = NO_EPISODES,
  hidden = false,
  historyHref,
  onHide,
  seriesId,
}: KeysProps) {
  const marking = useRemoteMarking(seriesId);
  const models = hidden ? HIDDEN_MODELS : MODELS;
  return (
    <>
      <BigKey
        episodes={episodes}
        hasAired
        marking={marking}
        seriesId={seriesId}
      />
      <SmallKeys
        historyHref={historyHref}
        marking={marking}
        models={models}
        onHide={onHide}
      />
    </>
  );
}

/**
 * The ⋯ on the owner's In progress tile and its Remote: Watched next episode
 * (N), Edit watch history (E), Hide from in progress (H). Opens under the ⋯.
 * `hidden`: the Library's Hidden shelf, where H is latched ("Hidden from in
 * progress") and brings the show back.
 *
 * @example
 * <TileRemote seriesId={136315} seriesName="The Bear" ink={tile.backdropColor} historyHref="/136315/the-bear?season=3&history" episodes={season} onHide={animateOut} />
 */
export default function TileRemote({
  className,
  iconSize,
  ink,
  placement = 'below',
  seriesName,
  size = 32,
  ...keys
}: TileRemoteProps) {
  return (
    <Remote
      className={className}
      ink={ink}
      placement={placement}
      seriesName={seriesName}
      triggerIconSize={iconSize}
      triggerSize={size}
    >
      <TileKeys {...keys} />
    </Remote>
  );
}
