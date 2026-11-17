'use client';

import * as m from 'motion/react-m';
import { useStore } from 'zustand';

import { infoGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import type { ShelfMeta } from '../_lib/shelves';
import { useTileContext } from './tileContext';

const BAR =
  'flex h-14 items-center gap-3 rounded-16 bg-[#0f1314] pr-2.5 pl-5 text-[14px] leading-5 font-semibold shadow-[0_16px_40px_-12px_rgb(0_0_0/0.8),inset_0_0_0_1px_rgb(255_255_255/0.1)] max-md:h-[60px] max-md:text-[13px]';

const WHITE =
  'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-[18px] text-[14px] leading-5 font-semibold whitespace-nowrap text-[#171717] transition-colors hover:bg-white/90 max-md:px-3.5 max-md:text-[13px]';

const GHOST =
  'inline-flex h-9 cursor-pointer items-center justify-center rounded-full px-3.5 text-meta font-semibold whitespace-nowrap text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/0.2)] transition-shadow hover:shadow-[inset_0_0_0_2px_rgb(255_255_255/0.4)]';

/** The bar rises in (translateY 100% → 0), 240ms */
const RISE = {
  animate: { opacity: 1, y: 0 },
  initial: { opacity: 0, y: '100%' },
  transition: { duration: 0.24, ease: [0.2, 0.8, 0.2, 1] },
} as const;

/**
 * Select mode's bar, at the foot of the screen aligned
 * to the main column: "4 shows selected", the shelf's one action and
 * Cancel; before a pick, how selecting works. The phone's bar has the count
 * and the action's short name. It reads the count from the grid's
 * selection itself, so a pick doesn't re-render the grid.
 */
export default function ActionBar({
  action,
  onAct,
  onCancel,
}: Readonly<{
  action: NonNullable<ShelfMeta['action']>;
  onAct: () => void;
  onCancel: () => void;
}>) {
  const { selection } = useTileContext();
  const count = useStore(selection, (state) => state.selected.size);
  const desktopCount = `${count} series selected`;
  const phoneCount = `${count} selected`;
  // A phone shows no bar before the first pick: then the bar takes no space
  // either (its margin and the column's gap moved the footer down)
  const wrapper = cn(
    'pointer-events-none sticky bottom-8 z-20 mt-6 max-md:-mx-1 max-md:bottom-7',
    count === 0 && 'max-md:hidden',
  );
  return (
    <div className={wrapper}>
      <m.div
        aria-label="Selected series"
        className="pointer-events-auto"
        role="toolbar"
        {...RISE}
      >
        {count === 0 ? (
          <div className={`${BAR} font-medium text-white/80 max-md:hidden`}>
            <Icon className="shrink-0" glyph={infoGlyph} size={16} />
            <span>Click posters to select. Shift-click selects a run.</span>
            <span className="flex-1" />
            <button className={GHOST} onClick={onCancel} type="button">
              Cancel
            </button>
          </div>
        ) : (
          <div className={BAR}>
            <span aria-live="polite">
              <span className="max-md:hidden">{desktopCount}</span>
              <span className="md:hidden">{phoneCount}</span>
            </span>
            <span className="flex-1" />
            <button className={WHITE} onClick={onAct} type="button">
              <Icon glyph={action.glyph} size={16} />
              <span className="max-md:hidden">{action.label}</span>
              <span className="md:hidden">{action.short}</span>
            </button>
            <button
              className={`${GHOST} max-md:hidden`}
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
          </div>
        )}
      </m.div>
    </div>
  );
}
