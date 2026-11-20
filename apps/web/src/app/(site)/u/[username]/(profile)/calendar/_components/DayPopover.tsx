'use client';

import { useMotionValue } from 'motion/react';
import { type KeyboardEvent, type RefObject, useId } from 'react';

import { SHEET_EASE } from '@/components/motion/ease';
import AnchoredPopover from '@/components/ui/popover/AnchoredPopover';

import type { CalendarDayModel } from '../_lib/calendarModel';
import DayHeader from './DayHeader';
import DaySteps from './DaySteps';
import DayTickets from './DayTickets';
import { placeDay } from './placeDay';

/**
 * 26px corners: concentric with the 12px tickets 14px in. The arrow points
 * up from under the cell, down from above it (`data-side`, set as it is placed).
 */
const PANEL =
  'flex w-[448px] flex-col gap-3 rounded-[26px] bg-ground-deep p-3.5 text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1),0_30px_60px_-20px_rgb(0_0_0/0.9)] outline-none before:absolute before:left-[calc(var(--arrow)-7px)] before:size-3.5 before:rotate-45 before:bg-ground-deep data-[side=above]:before:-bottom-[7px] data-[side=above]:before:shadow-[1px_1px_0_0_rgb(255_255_255/0.1)] data-[side=below]:before:-top-[7px] data-[side=below]:before:shadow-[-1px_-1px_0_0_rgb(255_255_255/0.1)]';

/** Above five tickets the list scrolls in itself (room for the notches); shorter when the window is */
const TICKETS =
  '-my-[7px] flex max-h-[482px] flex-col gap-3 overflow-y-auto overscroll-contain py-[7px]';

const INITIAL = { opacity: 0, scale: 0.96 } as const;
const EXIT = {
  opacity: 0,
  scale: 0.98,
  transition: { duration: 0.12, ease: 'easeOut' },
} as const;

const focusPanel = (panel: HTMLElement) => panel.focus({ preventScroll: true });

/**
 * A day's tickets in a popover on its cell: a non-modal dialog named by its
 * date, in the top layer against the window (under the cell when it fits,
 * else over it, else shortened on the roomier side), so it opens fully in
 * view without scrolling the page, which is locked while it is open. It
 * grows from its arrow, 6px toward the cell, in 200ms on the sheet curve
 * (after a month's slide when the day was in another month) and leaves in
 * 120ms. Esc and ✕ close it and return focus to the day; a press anywhere
 * outside closes it too. ‹ › go to the dated day before and after.
 */
export default function DayPopover({
  afterSlide,
  cellOf,
  day,
  next,
  now,
  onClose,
  onGo,
  previous,
  stage,
}: Readonly<{
  afterSlide: boolean;
  /** The day's cell in the month's grid */
  cellOf: () => HTMLElement | null;
  day: CalendarDayModel;
  next: string | null;
  now: number;
  onClose: (refocus: boolean) => void;
  onGo: (iso: string) => void;
  previous: string | null;
  stage: RefObject<HTMLDivElement | null>;
}>) {
  const titleId = useId();
  // the side is known once measured, after the first render: the drift
  // toward the cell starts from here
  const y = useMotionValue(0);
  const place = (panel: HTMLElement, cell: HTMLElement) => {
    const first = !panel.dataset.side;
    if (!stage.current) {
      return;
    }
    const side = placeDay(panel, cell, stage.current);
    if (first) {
      y.set(side === 'below' ? -6 : 6);
    }
  };
  const dismiss = () => onClose(false);
  const close = () => onClose(true);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  const animate = {
    opacity: 1,
    scale: 1,
    transition: {
      delay: afterSlide ? 0.2 : 0,
      duration: 0.2,
      ease: SHEET_EASE,
    },
    y: 0,
  };
  const style = { y };
  return (
    <AnchoredPopover
      anchor={cellOf}
      animate={animate}
      aria-labelledby={titleId}
      aria-modal="false"
      className={PANEL}
      exit={EXIT}
      initial={INITIAL}
      onDismiss={dismiss}
      onKeyDown={onKeyDown}
      onShow={focusPanel}
      place={place}
      role="dialog"
      style={style}
      tabIndex={-1}
    >
      <DayHeader day={day} onClose={close} titleId={titleId} />
      <div className={TICKETS} data-day-tickets="">
        <DayTickets day={day} now={now} />
      </div>
      <DaySteps next={next} now={now} onGo={onGo} previous={previous} />
    </AnchoredPopover>
  );
}
