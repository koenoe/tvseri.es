'use client';

import {
  type MouseEvent,
  memo,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useRef,
} from 'react';
import { useStore } from 'zustand';
import { LazyShowRemote, LazyTileRemote } from '@/components/remote/LazyRemote';
import Icon from '@/components/ui/icon/Icon';
import PosterArt from '@/components/ui/tile/PosterArt';
import TileLink from '@/components/ui/tile/TileLink';
import cn from '@/lib/cn';
import { LONG_PRESS_MS } from '@/lib/longPress';
import { useMarkingStoreApi } from '@/lib/marking/MarkingProvider';
import showPath from '@/lib/routing/showPath';

import { FACT_GLYPH } from '../_lib/factGlyphs';
import { useLiveWatchingTile } from '../_lib/liveTile';
import type { TileView } from '../_lib/tileView';
import { POSTER_VARS } from './gridStyles';
import {
  CheckCircle,
  HeartBadge,
  ProgressLine,
  VisitorOverlay,
} from './TileOverlays';
import { useTileContext } from './tileContext';

/** The ⋯ shows on hover, focus and while open; always on touch screens */
const MENU =
  'opacity-0 transition-opacity duration-160 group-hover/lt:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 [@media(hover:none)]:opacity-100';

type Props = Readonly<{
  tile: TileView;
  /** The first ten posters load at once, the rest when near */
  eager: boolean;
  sizes: string;
}>;

const FACT = 'inline-flex min-w-0 max-w-full items-center gap-1.5';
const FACT_AT_END = `${FACT} ml-auto`;

/** The tile's title and its one meta line (`.tx`) */
function TileText({ tile }: Readonly<{ tile: TileView }>) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-[13px] leading-5 font-semibold text-white md:text-[14px]">
        {tile.title}
      </span>
      {/* one line: a fact that doesn't fit beside the ones before it wraps
          to another line the row clips away (drops whole, never "11 to…");
          a fact wider than the whole line ends with an ellipsis. The
          lines stack upwards (`wrap-reverse`), so a dropped fact's box stays
          inside the tile, never below the grid */}
      <span className="flex h-5 min-w-0 flex-wrap-reverse content-start items-center gap-x-2 gap-y-8 overflow-clip text-[12px] leading-5 whitespace-nowrap text-white/60 md:gap-x-3 md:text-[13px]">
        {tile.code ? (
          <span className="inline-flex h-5 shrink-0 items-center rounded-6 bg-white/10 px-[5px] text-[11px] font-semibold text-white tabular-nums">
            {tile.code}
          </span>
        ) : null}
        {tile.meta.map((fact, index) => {
          const glyph = FACT_GLYPH[fact.kind];
          // beside the code badge the text ends on the poster's right edge
          const place = tile.code && index === 0 ? FACT_AT_END : FACT;
          return (
            <span className={place} key={fact.text}>
              {glyph ? (
                <Icon className="shrink-0" glyph={glyph} size={13} />
              ) : null}
              <span className="min-w-0 overflow-hidden text-ellipsis">
                {fact.text}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

/** Is the show still on the list the shelf shows? null while unknown */
function useStillOn() {
  const store = useMarkingStoreApi();
  return (id: number, list: 'favorites' | 'watchlist'): boolean | null => {
    // the library ids follow every toggle at once (a show's seed can land
    // after the toggle with the list as it was before)
    const { library, series } = store.getState();
    if (library.status === 'ready') {
      return library.ids[list].includes(id);
    }
    const status = series[id]?.view.status;
    if (!status) {
      return null;
    }
    return list === 'favorites' ? status.isFavorited : status.isWatchlisted;
  };
}

/**
 * The owner's ⋯: the tile Remote on Watching and Hidden, the show Remote
 * elsewhere; the ⋯ alone until a pointer or focus reaches it
 */
function OwnerRemote({ tile }: Readonly<{ tile: TileView }>) {
  const { leave, shelf } = useTileContext();
  const stillOn = useStillOn();
  const historyHref = `${showPath(tile.id, tile.slug)}?season=${tile.historySeason}&history`;
  const hidden = shelf === 'hidden';
  const onHide = useCallback(
    () => leave(tile.id, hidden ? 'unhide' : 'hide'),
    [hidden, leave, tile.id],
  );
  if (shelf === 'watching' || shelf === 'hidden') {
    return (
      <LazyTileRemote
        className={MENU}
        hidden={hidden}
        historyHref={historyHref}
        onHide={onHide}
        placement="below-start"
        seriesId={tile.id}
        seriesName={tile.title}
      />
    );
  }
  // W or F off on its own shelf: the tile goes when the Remote closes, not under the pointer
  const onClose =
    shelf === 'watchlist' || shelf === 'favourites'
      ? () => {
          const list = shelf === 'watchlist' ? 'watchlist' : 'favorites';
          if (stillOn(tile.id, list) === false) {
            leave(
              tile.id,
              shelf === 'watchlist' ? 'watchlist-remove' : 'favourites-remove',
            );
          }
        }
      : undefined;
  return (
    <LazyShowRemote
      className={MENU}
      hasAired={tile.hasAired}
      historyHref={historyHref}
      onClose={onClose}
      placement="below-start"
      seriesId={tile.id}
      seriesName={tile.title}
      size={32}
    />
  );
}

/** The poster with what sits on it */
function Poster({
  children,
  eager,
  sizes,
  tile,
}: Props & Readonly<{ children?: ReactNode }>) {
  // a visitor's tiles carry the relation pill instead
  const { owner } = useTileContext();
  return (
    <span
      className="relative block transition-transform duration-160 ease-[cubic-bezier(.2,.8,.2,1)] group-hover/lt:-translate-y-0.5"
      style={POSTER_VARS}
    >
      <PosterArt
        loading={eager ? 'eager' : 'lazy'}
        poster={tile.posterImage}
        sizes={sizes}
        title={tile.title}
      />
      {tile.line ? (
        <ProgressLine aired={tile.line.aired} watched={tile.line.watched} />
      ) : null}
      {tile.heart && owner ? <HeartBadge /> : null}
      {children}
    </span>
  );
}

/**
 * One Library tile: the poster (10px corners, the 4px
 * progress line on Watching, the heart on Favourites), one title line and
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
  const selecting = useStore(selection, (state) => state.selecting);
  const picked = useStore(selection, (state) => state.selected.has(tile.id));
  const pressed = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressedLong = useRef(false);

  const cancelPress = () => {
    if (pressed.current) {
      clearTimeout(pressed.current);
      pressed.current = null;
    }
  };
  const startPress = (event: PointerEvent) => {
    if (!owner || event.pointerType !== 'touch') {
      return;
    }
    pressedLong.current = false;
    cancelPress();
    pressed.current = setTimeout(() => {
      pressedLong.current = true;
      longPress(tile.id);
    }, LONG_PRESS_MS);
  };
  const toggle = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (pressedLong.current) {
        pressedLong.current = false;
        return;
      }
      pick(tile.id, event.shiftKey);
    },
    [pick, tile.id],
  );
  const follow = useCallback((event: MouseEvent) => {
    if (pressedLong.current) {
      event.preventDefault();
      pressedLong.current = false;
    }
  }, []);
  const touch = {
    onContextMenu: (event: { preventDefault: () => void }) => {
      if (owner && pressedLong.current) {
        event.preventDefault();
      }
    },
    onPointerCancel: cancelPress,
    onPointerDown: startPress,
    onPointerLeave: cancelPress,
    onPointerUp: cancelPress,
  };

  if (selecting) {
    const label = `${picked ? 'Deselect' : 'Select'} ${tile.title}`;
    return (
      <button
        aria-label={label}
        aria-pressed={picked}
        className="group/lt flex w-full min-w-0 cursor-pointer flex-col gap-2.5 text-left"
        data-slot="library-tile"
        onClick={toggle}
        type="button"
      >
        <span
          className={cn(
            'block rounded-10 transition-[scale,box-shadow] duration-160 ease-out',
            picked
              ? 'scale-96 shadow-[0_0_0_2px_#fff]'
              : '[&_img]:brightness-[.82]',
          )}
        >
          <Poster eager={eager} sizes={sizes} tile={tile}>
            <CheckCircle picked={picked} />
          </Poster>
        </span>
        <TileText tile={tile} />
      </button>
    );
  }

  return (
    <div
      className="group/lt relative flex min-w-0 flex-col"
      data-slot="library-tile"
      {...touch}
    >
      <TileLink
        className="flex min-w-0 flex-col gap-2.5 rounded-10 focus-visible:outline-offset-4"
        href={showPath(tile.id, tile.slug)}
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
