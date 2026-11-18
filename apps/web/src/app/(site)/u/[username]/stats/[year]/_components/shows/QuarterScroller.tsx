'use client';

import type { CSSProperties, ReactNode } from 'react';

import {
  monthsInView,
  NOMINAL_WEEKS,
  PHONE_TRACK_PX,
  PHONE_WEEK_PX,
  QUARTERS,
  type TimelineRow,
} from './model';
import Overview from './Overview';
import OverviewSlider from './OverviewSlider';
import Segmented, { type SegmentedOption } from './Segmented';
import useQuarterScroll from './useQuarterScroll';

const OPTIONS: ReadonlyArray<SegmentedOption<number>> = QUARTERS.map(
  (label, value) => ({ label, value }),
);

/**
 * The phone's year in series, a quarter at a time (md and up it steps
 * aside: `display: contents`, the rows span the year as before).
 *
 * The rows (`children`) scroll sideways on a 24px-a-week track, snapping to
 * the quarters' first days. One passive scroll listener, once a frame:
 * - moves the overview's window (a transform),
 * - shows the pointers of the rows whose line is out of view,
 * - flags the edges that have more beyond them (`data-fl`, `data-fr`),
 * - writes the overview slider's value (the first week in view) and the
 *   months in view,
 * - and lights the quarter in view (a tapped one stays lit on the way; a
 *   swipe, or a drag or key on the overview, lets go of it).
 * The quarter switch and the overview's slider scroll without swiping. The scroller is focusable
 * (arrow keys scroll it) only while it scrolls.
 */
export default function QuarterScroller({
  children,
  label,
  opening,
  overview,
  year,
}: Readonly<{
  children: ReactNode;
  label: string;
  /** The quarter it opens on (0 to 3) */
  opening: number;
  /** The overview's lines */
  overview: ReadonlyArray<TimelineRow>;
  year: number;
}>) {
  const {
    grab,
    quarter,
    scrollerRef,
    scrolls,
    select,
    sliderRef,
    starts,
    windowRef,
  } = useQuarterScroll(opening, year);
  const openingAt = starts[opening] ?? 0;

  // Until it measures: the opening quarter's window at a 390px phone's
  // width, and the first weeks in view (the scroll starts at 0)
  const windowStyle: CSSProperties = {
    left: `${((openingAt / PHONE_TRACK_PX) * 100).toFixed(3)}%`,
    width: `${((NOMINAL_WEEKS * PHONE_WEEK_PX * 100) / PHONE_TRACK_PX).toFixed(3)}%`,
  };
  const openingWeek = Math.round(openingAt / PHONE_WEEK_PX);
  const sliderInitial = {
    last: Math.ceil(PHONE_TRACK_PX / PHONE_WEEK_PX - NOMINAL_WEEKS),
    now: openingWeek,
    text: monthsInView(openingWeek, openingWeek + NOMINAL_WEEKS, year),
  };
  const focusable = scrolls
    ? ({ 'aria-label': label, role: 'region', tabIndex: 0 } as const)
    : {};
  const contentStyle = { width: PHONE_TRACK_PX } satisfies CSSProperties;

  return (
    <>
      <Overview rows={overview}>
        <OverviewSlider
          initial={sliderInitial}
          onGrab={grab}
          ref={sliderRef}
          scrollerRef={scrollerRef}
          windowRef={windowRef}
          windowStyle={windowStyle}
        />
      </Overview>
      <div className="mt-1.5 md:hidden">
        <Segmented
          className="grid grid-cols-4"
          itemClassName="py-[3px] text-center text-meta leading-6"
          label="Quarter"
          onChange={select}
          options={OPTIONS}
          value={quarter}
        />
      </div>
      <div
        className="group/qs mt-3 snap-x snap-proximity overflow-x-auto overscroll-x-contain [container-type:inline-size] [scrollbar-width:none] md:contents [&::-webkit-scrollbar]:hidden"
        data-fr=""
        ref={scrollerRef}
        {...focusable}
      >
        <div className="relative md:contents" style={contentStyle}>
          {starts.map((start) => {
            const snap = { left: start };
            return (
              <span
                aria-hidden
                className="absolute top-0 size-px snap-start md:hidden"
                key={start}
                style={snap}
              />
            );
          })}
          {children}
        </div>
      </div>
    </>
  );
}
