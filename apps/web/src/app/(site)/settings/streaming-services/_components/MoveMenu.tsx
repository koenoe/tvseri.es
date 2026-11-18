'use client';

import type { WatchProvider } from '@tvseri.es/schemas';
import { type PointerEvent, useCallback } from 'react';

import { gripGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { MENU_ITEM, MENU_PANEL, useMenu } from '@/components/ui/menu/useMenu';
import cn from '@/lib/cn';
import { type Move, movesFor } from '../_lib/moves';

const ITEMS = '[role="menuitem"]';
const PANEL = cn(MENU_PANEL, 'mt-1');

/**
 * A row's ⋮⋮ handle: drag it (`onGrab`), or press it for the Move menu, the
 * way to reorder without dragging. A press that ended a drag doesn't open
 * the menu. The menu offers only the moves that apply; a pick returns focus
 * to the handle.
 */
export default function MoveMenu({
  count,
  dragged,
  index,
  onGrab,
  onMove,
  provider,
}: Readonly<{
  count: number;
  /** True once if the press just ended a drag (and clears it) */
  dragged: () => boolean;
  index: number;
  onGrab: (event: PointerEvent<HTMLElement>) => void;
  onMove: (provider: WatchProvider, to: number) => void;
  provider: WatchProvider;
}>) {
  const {
    close,
    menu,
    menuId,
    onMenuKey,
    onTriggerKey,
    open,
    toggle,
    trigger,
  } = useMenu({ focus: ITEMS, items: ITEMS });
  const onClick = useCallback(() => {
    if (!dragged()) {
      toggle();
    }
  }, [dragged, toggle]);
  const pick = useCallback(
    (to: number) => {
      close();
      onMove(provider, to);
    },
    [close, onMove, provider],
  );

  const label = `Move ${provider.name}, ${index + 1} of ${count}`;
  const moves = movesFor(index, count);
  return (
    <>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-10 text-white/60 transition-colors group-hover/row:bg-white/6 group-hover/row:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white active:cursor-grabbing aria-expanded:bg-white/10 aria-expanded:text-white max-md:size-11"
        onClick={onClick}
        onKeyDown={onTriggerKey}
        onPointerDown={onGrab}
        ref={trigger}
        title="Drag, or press for move options"
        type="button"
      >
        <Icon glyph={gripGlyph} size={16} />
      </button>
      {open ? (
        <div
          aria-label={`Move ${provider.name}`}
          className={PANEL}
          id={menuId}
          onKeyDown={onMenuKey}
          ref={menu}
          role="menu"
        >
          {moves.map((move) => (
            <MoveItem key={move.label} move={move} onPick={pick} />
          ))}
        </div>
      ) : null}
    </>
  );
}

/** One row of the menu: an icon and the move */
function MoveItem({
  move,
  onPick,
}: Readonly<{ move: Move; onPick: (to: number) => void }>) {
  const pick = useCallback(() => onPick(move.to), [move.to, onPick]);
  return (
    <button
      className={cn(
        MENU_ITEM,
        'text-white/80 hover:bg-white/8 hover:text-white',
      )}
      onClick={pick}
      role="menuitem"
      tabIndex={-1}
      type="button"
    >
      <Icon className="text-white/60" glyph={move.glyph} size={16} />
      {move.label}
    </button>
  );
}
