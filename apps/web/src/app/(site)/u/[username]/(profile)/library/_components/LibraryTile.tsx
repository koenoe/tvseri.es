'use client';

import { memo, useCallback } from 'react';
import { useStore } from 'zustand';

import TileLink from '@/components/ui/tile/TileLink';
import cn from '@/lib/cn';
import type { TileView } from '@/lib/profile/tileView';
import showPath from '@/lib/routing/showPath';
import { useLeaveHiddenOnWatch, useLiveWatchingTile } from '../_lib/liveTile';
import { useTilePress } from '../_lib/useTilePress';
import OwnerRemote from './OwnerRemote';
import { Poster, TileText } from './TileBody';
import { CheckCircle, VisitorOverlay } from './TileOverlays';
import { useTileContext } from './tileContext';

type Props = Readonly<{
  tile: TileView;
  /** The first ten posters load at once, the rest when near */
  eager: boolean;
  sizes: string;
}>;

/**
 * One Library tile: the poster (10px corners, the 4px
 * progress line on Watching, the heart on a favourite), one title line and
 * one meta line. Browsing it is a link with the owner's ⋯ (the Remote) or a
 * visitor's relation pill and +; in select mode it is a toggle
 * (`aria-pressed`) with the check circle, scaled to .96 when picked.
 */
function LibraryTile({ eager, sizes, tile: served }: Props) {
  const { leave, longPress, owner, pick, selection, shelf } = useTileContext();
  const finished = useCallback(
    () => leave(served.id, 'finished'),
    [leave, served.id],
  );
  // Watching follows the store once the Remote seeded the show (N moves it on)
  const tile = useLiveWatchingTile(
    served,
    owner && shelf === 'watching',
    finished,
  );
  // N on a hidden show brings it back to In progress
  useLeaveHiddenOnWatch(served.id, owner && shelf === 'hidden', leave);
  const selecting = useStore(selection, (state) => state.selecting);
  const picked = useStore(selection, (state) => state.selected.has(tile.id));
  const { follow, toggle, touch } = useTilePress(
    tile.id,
    owner,
    longPress,
    pick,
  );

  if (selecting) {
    const label = `${picked ? 'Deselect' : 'Select'} ${tile.title}`;
    const frame = cn(
      'block rounded-10 transition-[scale,box-shadow] duration-160 ease-out',
      picked ? 'scale-96 shadow-[0_0_0_2px_#fff]' : '[&_img]:brightness-[.82]',
    );
    return (
      <button
        aria-label={label}
        aria-pressed={picked}
        className="group/lt flex w-full min-w-0 cursor-pointer flex-col gap-2.5 text-left"
        data-slot="library-tile"
        onClick={toggle}
        type="button"
      >
        <span className={frame}>
          <Poster eager={eager} sizes={sizes} tile={tile}>
            <CheckCircle picked={picked} />
          </Poster>
        </span>
        <TileText tile={tile} />
      </button>
    );
  }

  const href = showPath(tile.id, tile.slug);
  return (
    <div
      className="group/lt relative flex min-w-0 flex-col"
      data-slot="library-tile"
      {...touch}
    >
      <TileLink
        className="flex min-w-0 flex-col gap-2.5 rounded-10 focus-visible:outline-offset-4"
        href={href}
        onClick={follow}
      >
        <Poster eager={eager} sizes={sizes} tile={tile} />
        <TileText tile={tile} />
      </TileLink>
      <span className="absolute inset-x-0 top-0 aspect-2/3 pointer-events-none [&>*]:pointer-events-auto">
        {owner ? (
          <span className="absolute top-2 right-2 z-3">
            <OwnerRemote tile={tile} />
          </span>
        ) : (
          <VisitorOverlay
            favourite={tile.on.favourite}
            id={tile.id}
            title={tile.title}
          />
        )}
      </span>
    </div>
  );
}

const MemoTile = memo(LibraryTile);
MemoTile.displayName = 'LibraryTile';

export default MemoTile;
