'use client';

import { useIsPresent } from 'motion/react';
import * as m from 'motion/react-m';
import { type RefObject, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';

import { BAR_RISE } from '@/components/motion/barRise';
import CrossFade from '@/components/motion/CrossFade';
import { infoGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { FOCUSABLE } from '@/lib/a11y/focusable';
import cn from '@/lib/cn';

import type { SelectionStore } from '../_lib/selection';
import type { ShelfMeta } from '../_lib/shelves';
import { useTileContext } from './tileContext';
import { SELECT_PILL } from './toolbarStyles';

/** Round like its 40px action (8px in), so the ends stay concentric */
const BAR =
  'flex h-14 items-center gap-3 rounded-full bg-[#0f1314] pr-2.5 pl-5 text-[14px] leading-5 font-semibold shadow-[0_16px_40px_-12px_rgb(0_0_0/0.8),inset_0_0_0_1px_rgb(255_255_255/0.1)] max-md:h-[60px] max-md:text-[13px]';

/** The shelf's action: its icon's side 2px closer than the text's */
const WHITE =
  'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-white pr-[18px] pl-4 text-[14px] leading-5 font-semibold whitespace-nowrap text-[#171717] transition-[background-color,scale] duration-150 ease-out hover:bg-white/90 active:scale-96 max-md:pr-3.5 max-md:pl-3 max-md:text-[13px]';

const GHOST =
  'inline-flex h-9 cursor-pointer items-center justify-center rounded-full px-3.5 text-meta font-semibold whitespace-nowrap text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/0.2)] transition-[box-shadow,scale] duration-150 ease-out hover:shadow-[inset_0_0_0_2px_rgb(255_255_255/0.4)] active:scale-96';

const HINT_BAR = `${BAR} font-medium text-white/80 max-md:hidden`;

const DESKTOP_CANCEL = `${GHOST} max-md:hidden`;

/**
 * Where focus held in the leaving bar goes: Select, which brings the bar
 * back, or the toolbar's first control when the action emptied the shelf
 * and took Select with it. The page stays where it is, as a lane's
 * hand-over does (`focusLaneHeading`): scrolled to, Select would sit under
 * the sticky header.
 */
function returnFocus(bar: HTMLElement | null, toolbar: HTMLElement | null) {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !bar?.contains(active)) {
    return;
  }
  const target =
    toolbar?.querySelector<HTMLElement>(`[${SELECT_PILL}]`) ??
    toolbar?.querySelector<HTMLElement>(FOCUSABLE);
  target?.focus({ preventScroll: true });
}

/**
 * Select mode's bar, at the foot of the screen aligned
 * to the main column: "4 series selected", the shelf's one action and
 * Cancel; before a pick, how selecting works (the two cross-fade). The
 * phone's bar has the count and the action's short name. It reads the
 * count from the grid's selection itself, so a pick doesn't re-render the
 * grid; a screen reader hears it from `SelectionStatus`. The parent
 * mounts it in an `AnimatePresence`, so it can leave; focus held in it
 * goes back to Select.
 */
export default function ActionBar({
  action,
  onAct,
  onCancel,
  returnFocusTo,
}: Readonly<{
  action: NonNullable<ShelfMeta['action']>;
  onAct: () => void;
  onCancel: () => void;
  /** The shelf's toolbar, which holds Select */
  returnFocusTo: RefObject<HTMLElement | null>;
}>) {
  const count = useHeldCount();
  // Leaving, it can't be pressed twice
  const leaving = !useIsPresent();
  const bar = useRef<HTMLDivElement>(null);
  // in the commit that makes it inert, before focus falls to the page
  useLayoutEffect(() => {
    if (leaving) {
      returnFocus(bar.current, returnFocusTo.current);
    }
  }, [leaving, returnFocusTo]);
  const hint = count === 0;
  const layer = hint ? HINT_BAR : BAR;
  // A phone shows no bar before the first pick, and then it takes no space
  // either: its margin and the column's gap would push the footer down
  const wrapper = cn(
    'pointer-events-none sticky bottom-8 z-20 mt-6 max-md:-mx-1 max-md:bottom-7',
    hint && 'max-md:hidden',
  );
  return (
    <div className={wrapper}>
      <m.div
        aria-label="Selected series"
        className="pointer-events-auto"
        inert={leaving}
        ref={bar}
        role="toolbar"
        {...BAR_RISE}
      >
        <CrossFade className={layer} swapKey={hint ? 'hint' : 'count'}>
          {hint ? (
            <>
              <Icon className="shrink-0" glyph={infoGlyph} size={16} />
              <span>Click posters to select. Shift-click selects a run.</span>
              <span className="flex-1" />
              <button className={GHOST} onClick={onCancel} type="button">
                Cancel
              </button>
            </>
          ) : (
            <>
              <SelectedCount count={count} />
              <span className="flex-1" />
              <button className={WHITE} onClick={onAct} type="button">
                <Icon glyph={action.glyph} size={16} />
                <span className="max-md:hidden">{action.label}</span>
                <span className="md:hidden">{action.short}</span>
              </button>
              <button
                className={DESKTOP_CANCEL}
                onClick={onCancel}
                type="button"
              >
                Cancel
              </button>
            </>
          )}
        </CrossFade>
      </m.div>
    </div>
  );
}

/**
 * The selection's size, held while the bar leaves: Cancel and the action
 * empty the selection, and the leaving bar shouldn't turn into the hint
 * (or vanish on a phone) on its way out
 */
function useHeldCount() {
  const { selection } = useTileContext();
  const live = useStore(selection, (state) => state.selected.size);
  const present = useIsPresent();
  const [held, setHeld] = useState(live);
  if (present && held !== live) {
    setHeld(live);
  }
  return present ? live : held;
}

/** The visible count; `SelectionStatus` says it */
function SelectedCount({ count }: Readonly<{ count: number }>) {
  const desktopCount = `${count} series selected`;
  const phoneCount = `${count} selected`;
  return (
    <span aria-hidden="true" className="tabular-nums">
      <span className="max-md:hidden">{desktopCount}</span>
      <span className="md:hidden">{phoneCount}</span>
    </span>
  );
}

/**
 * "4 series selected" for a screen reader: one region, mounted with the
 * shelf before the first pick (a phone's long-press starts select mode
 * with a pick) and outside the bar, whose hint and count swap and which a
 * phone hides before a pick. Empty while nothing is picked. Its own read
 * of the selection, so a pick doesn't re-render the grid.
 */
export function SelectionStatus({
  selection,
}: Readonly<{ selection: SelectionStore }>) {
  const count = useStore(selection, (state) => state.selected.size);
  const text = count > 0 ? `${count} series selected` : '';
  return (
    <span className="sr-only" role="status">
      {text}
    </span>
  );
}
