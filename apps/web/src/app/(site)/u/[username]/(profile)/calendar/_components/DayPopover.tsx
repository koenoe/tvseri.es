'use client';

import * as m from 'motion/react-m';
import {
  type CSSProperties,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
} from 'react';
import { SHEET_EASE } from '@/components/motion/ease';
import {
  chevronLeftGlyph,
  chevronRightGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';
import { formatAirWeekdayDate } from '@/lib/format/airDate';
import scrollBehavior from '@/lib/media/scrollBehavior';

import type { CalendarDayModel } from '../_lib/calendarModel';
import DayHeader from './DayHeader';
import DayTickets from './DayTickets';

/** Where the popover sits in the calendar's stage, and its arrow on the cell's centre */
export type PopoverPlace = Readonly<{
  arrow: number;
  below: boolean;
  /** From the stage's top (below the cell) or its bottom (above it) */
  edge: number;
  left: number;
}>;

/** 26px corners: concentric with the 12px tickets 14px in */
const PANEL =
  'absolute z-6 flex w-[448px] flex-col gap-3 rounded-[26px] bg-ground-deep p-3.5 scroll-mt-24 scroll-mb-4 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1),0_30px_60px_-20px_rgb(0_0_0/0.9)] outline-none before:absolute before:left-[calc(var(--arrow)-7px)] before:size-3.5 before:rotate-45 before:bg-ground-deep';

const ARROW_UP =
  'before:-top-[7px] before:shadow-[-1px_-1px_0_0_rgb(255_255_255/0.1)]';
const ARROW_DOWN =
  'before:-bottom-[7px] before:shadow-[1px_1px_0_0_rgb(255_255_255/0.1)]';

/** Above five tickets the list scrolls in itself (room for the notches) */
const TICKETS =
  '-my-[7px] flex max-h-[482px] flex-col gap-3 overflow-y-auto overscroll-contain py-[7px]';

const STEP =
  'relative inline-flex h-8 items-center gap-1 rounded-10 px-2.5 text-caption font-medium text-white/60 tabular-nums transition-[scale,background-color,color] duration-[150ms,100ms,100ms] ease-out after:absolute after:-inset-x-0.5 after:-inset-y-1 hover:bg-white/6 hover:text-white active:scale-96';

/**
 * A day's tickets in a popover under its cell (above it for the last two
 * rows): a non-modal dialog named by its date. It grows from its arrow in
 * 200ms on the sheet curve (after a month's slide when the day was in
 * another month) and leaves in 120ms. Esc and ✕ close it and return focus
 * to the day; a press anywhere outside closes it too. ‹ › go to the
 * dated day before and after, across months.
 */
export default function DayPopover({
  afterSlide,
  day,
  next,
  now,
  onClose,
  onGo,
  place,
  previous,
}: Readonly<{
  afterSlide: boolean;
  day: CalendarDayModel;
  next: string | null;
  now: number;
  onClose: (refocus: boolean) => void;
  onGo: (iso: string) => void;
  place: PopoverPlace;
  previous: string | null;
}>) {
  const titleId = useId();
  const dismiss = useEffectEvent(() => onClose(false));

  // light dismiss: a press outside (the scrim over the month takes the ones on it)
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        !event.target.closest('[data-day-popover]')
      ) {
        dismiss();
      }
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, []);

  // focus without a jump, then bring a popover that opens past the screen's
  // edge into view (clear of the header)
  const focusOnOpen = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      return;
    }
    node.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() =>
      node.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' }),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
    }
  };
  const close = () => onClose(true);
  const goPrevious = () => previous && onGo(previous);
  const goNext = () => next && onGo(next);

  const style: CSSProperties & Readonly<Record<'--arrow', string>> = {
    '--arrow': `${place.arrow}px`,
    left: place.left,
    transformOrigin: `${place.arrow}px ${place.below ? '0' : '100%'}`,
    ...(place.below ? { top: place.edge } : { bottom: place.edge }),
  };
  const initial = { opacity: 0, scale: 0.96, y: place.below ? -6 : 6 };
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
  const exit = {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.12, ease: 'easeIn' },
  } as const;
  const className = cn(PANEL, place.below ? ARROW_UP : ARROW_DOWN);
  return (
    <m.div
      animate={animate}
      aria-labelledby={titleId}
      aria-modal="false"
      className={className}
      data-day-popover=""
      exit={exit}
      initial={initial}
      onKeyDown={onKeyDown}
      ref={focusOnOpen}
      role="dialog"
      style={style}
      tabIndex={-1}
    >
      <DayHeader day={day} onClose={close} titleId={titleId} />
      <div className={TICKETS}>
        <DayTickets day={day} now={now} />
      </div>
      <div className="flex justify-between gap-2">
        {previous ? (
          <button className={STEP} onClick={goPrevious} type="button">
            <Icon glyph={chevronLeftGlyph} size={16} />
            {formatAirWeekdayDate(previous, now)}
          </button>
        ) : (
          <span />
        )}
        {next ? (
          <button className={STEP} onClick={goNext} type="button">
            {formatAirWeekdayDate(next, now)}
            <Icon glyph={chevronRightGlyph} size={16} />
          </button>
        ) : null}
      </div>
    </m.div>
  );
}
