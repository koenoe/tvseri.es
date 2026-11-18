'use client';

import Image from 'next/image';
import { type CSSProperties, memo, useCallback } from 'react';

import { LATE_FADE } from '@/components/motion/lateFade';
import { userGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import MetaRow from '@/components/ui/meta/MetaRow';
import { PICTURE_LAYER } from '@/components/ui/picture/pictureSurface';
import { TILE_HOVER_WIDE } from '@/components/ui/tile/tileHover';
import WatchedLabel from '@/components/ui/tile/WatchedLabel';
import cn from '@/lib/cn';
import { useIsWatched } from '@/lib/marking/useWatched';
import type { LandscapeShow } from '../_data/landscape';

/** A cell and the one tile hover (`tileHover`: a 3% grow, above its neighbours); the selected cell keeps its white ring */
const CELL = `group relative block size-full cursor-pointer overflow-hidden rounded-12 bg-[#1b1d22] text-left after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_rgb(221_238_255/0.08)] aria-pressed:after:shadow-[inset_0_0_0_2px_#fff] ${TILE_HOVER_WIDE}`;

/** The Watched label's corner (it arrives after the first paint: fades in) */
const LABEL_CORNER = cn('absolute top-2.5 left-2.5', LATE_FADE);

type Props = Readonly<{
  index: number;
  onSelect: (index: number) => void;
  selected: boolean;
  show: LandscapeShow;
}>;

/**
 * One tile of the landscape: the backdrop under one
 * scrim (bottom 66%), the title (body 600) and, on a big enough tile, the
 * votes line; smaller tiles show the title on up to two lines. The cell's
 * place comes from the server's layout; the tile sits 4px inside it, so the
 * gaps stay 8px at every width. Pressed = the selected tile (white ring).
 */
function TreemapTile({ index, onSelect, selected, show }: Props) {
  const { cell } = show;
  const watched = useIsWatched(show.id);
  const style: CSSProperties = {
    height: `${cell.height}%`,
    left: `${cell.left}%`,
    top: `${cell.top}%`,
    width: `${cell.width}%`,
  };
  const onClick = useCallback(() => onSelect(index), [index, onSelect]);
  const votes = `${show.votes} votes`;
  const label = `${show.title}, ${votes}${watched ? ', watched' : ''}`;
  // phones draw the list instead: ask for the smallest image there
  const sizes = `(max-width: 767px) 1px, ${cell.tileWidth}px`;
  const loading = index === 0 ? 'eager' : 'lazy';
  // a word wider than the tile ("SquarePants", "Untouchables" at 800)
  // breaks, hyphenated where the language allows, instead of being cut
  // mid-letter by the tile
  const titleClass = cn(
    'text-body font-semibold text-white',
    cell.votesLine
      ? 'truncate'
      : 'line-clamp-2 hyphens-auto [overflow-wrap:anywhere]',
  );
  return (
    <div className="absolute p-1 hover:z-1" style={style}>
      <button
        aria-label={label}
        aria-pressed={selected}
        className={CELL}
        data-hairline
        onClick={onClick}
        type="button"
      >
        {/* the backdrop and its scrim: one layer, clipped once by the
            corners; the scrim a pixel past the tile, so its edge cuts
            through the scrim while it grows */}
        <span aria-hidden className={PICTURE_LAYER}>
          {show.backdrop ? (
            <Image
              alt=""
              className="object-cover saturate-90"
              fill
              loading={loading}
              sizes={sizes}
              src={show.backdrop}
            />
          ) : null}
          <span className="pointer-events-none absolute -inset-px bg-linear-to-t from-[rgb(10_11_14/0.92)] via-[rgb(10_11_14/0.6)] via-34% to-[rgb(10_11_14/0)] to-66%" />
        </span>
        {watched ? (
          <span aria-hidden className={LABEL_CORNER}>
            <WatchedLabel />
          </span>
        ) : null}
        <span className="absolute right-4 bottom-3 left-4 flex flex-col">
          <span className={titleClass}>{show.title}</span>
          {cell.votesLine ? (
            <MetaRow className="mt-1">
              <MetaItem icon={userGlyph}>{votes}</MetaItem>
            </MetaRow>
          ) : null}
        </span>
      </button>
    </div>
  );
}

const MemoTreemapTile = memo(TreemapTile);
MemoTreemapTile.displayName = 'TreemapTile';

export default MemoTreemapTile;
