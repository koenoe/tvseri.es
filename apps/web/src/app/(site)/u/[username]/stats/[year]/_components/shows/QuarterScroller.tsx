'use client';

import {
  type CSSProperties,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import {
  activeQuarter,
  PHONE_TRACK_PX,
  PHONE_WEEK_PX,
  QUARTERS,
  quarterStarts,
  type TimelineRow,
} from './model';
import Overview from './Overview';
import Segmented, { type SegmentedOption } from './Segmented';

const OPTIONS: ReadonlyArray<SegmentedOption<number>> = QUARTERS.map(
  (label, value) => ({ label, value }),
);

/** The weeks a 390px phone shows (318px of lane), until it measures its own */
const NOMINAL_WEEKS = 318 / PHONE_WEEK_PX;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * The phone's year in series, a quarter at a time (md and up it steps
 * aside: `display: contents`, the rows span the year as before).
 *
 * The rows (`children`) scroll sideways on a 24px-a-week track, snapping to
 * the quarters' first days. One passive scroll listener, once a frame:
 * - moves the overview's window (a transform),
 * - writes the weeks in view (`--from`, `--to`) for the rows' pointers,
 * - flags the edges that have more beyond them (`data-fl`, `data-fr`),
 * - and lights the quarter in view (a tapped one stays lit on the way).
 * The quarter switch scrolls without dragging. The scroller is focusable
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLSpanElement>(null);
  // The quarter a tap scrolls to: it stays lit on the way there
  const targetRef = useRef<number | null>(null);
  const [quarter, setQuarter] = useState(opening);
  const [scrolls, setScrolls] = useState(false);
  const starts = quarterStarts(year).map((week) => week * PHONE_WEEK_PX);
  const openingAt = starts[opening] ?? 0;

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const frame = windowRef.current;
    if (!scroller || !frame) {
      return;
    }
    const startsPx = quarterStarts(year).map((week) => week * PHONE_WEEK_PX);
    let pending = 0;
    const update = () => {
      pending = 0;
      const width = scroller.clientWidth;
      const max = scroller.scrollWidth - width;
      if (width === 0 || max <= 0) {
        setScrolls(false);
        return;
      }
      const x = scroller.scrollLeft;
      scroller.style.setProperty('--from', String(x / PHONE_WEEK_PX));
      scroller.style.setProperty('--to', String((x + width) / PHONE_WEEK_PX));
      scroller.toggleAttribute('data-fl', x > 1);
      scroller.toggleAttribute('data-fr', x < max - 1);
      const scale =
        (frame.parentElement?.clientWidth ?? width) / PHONE_TRACK_PX;
      frame.style.left = '0';
      frame.style.width = `${width * scale}px`;
      frame.style.transform = `translateX(${x * scale}px)`;
      const target = targetRef.current;
      if (target === null) {
        setQuarter(activeQuarter(x, startsPx, max));
      } else if (Math.abs(x - Math.min(startsPx[target] ?? 0, max)) < 1) {
        targetRef.current = null;
      }
      setScrolls(true);
    };
    const onScroll = () => {
      if (!pending) {
        pending = requestAnimationFrame(update);
      }
    };
    const max = scroller.scrollWidth - scroller.clientWidth;
    if (max > 0) {
      scroller.scrollLeft = Math.min(startsPx[opening] ?? 0, max);
    }
    update();
    // a swipe, wheel or key takes over from a tap's scroll
    const release = () => {
      targetRef.current = null;
    };
    const inputs = ['pointerdown', 'wheel', 'keydown'] as const;
    for (const input of inputs) {
      scroller.addEventListener(input, release, { passive: true });
    }
    scroller.addEventListener('scroll', onScroll, { passive: true });
    const resize = new ResizeObserver(onScroll);
    resize.observe(scroller);
    return () => {
      cancelAnimationFrame(pending);
      scroller.removeEventListener('scroll', onScroll);
      for (const input of inputs) {
        scroller.removeEventListener(input, release);
      }
      resize.disconnect();
    };
  }, [opening, year]);

  const select = (next: number) => {
    const scroller = scrollerRef.current;
    setQuarter(next);
    if (!scroller) {
      return;
    }
    const max = scroller.scrollWidth - scroller.clientWidth;
    targetRef.current = next;
    scroller.scrollTo({
      behavior: matchMedia(REDUCED_MOTION).matches ? 'auto' : 'smooth',
      left: Math.min(starts[next] ?? 0, max),
    });
  };

  // Until it measures: the opening quarter's window at a 390px phone's
  // width, and the first weeks in view (the scroll starts at 0)
  const windowStyle: CSSProperties = {
    left: `${((openingAt / PHONE_TRACK_PX) * 100).toFixed(3)}%`,
    width: `${((NOMINAL_WEEKS * PHONE_WEEK_PX * 100) / PHONE_TRACK_PX).toFixed(3)}%`,
  };
  const scrollerStyle = {
    '--from': '0',
    '--to': String(NOMINAL_WEEKS),
  } as CSSProperties;
  const focusable = scrolls
    ? ({ 'aria-label': label, role: 'region', tabIndex: 0 } as const)
    : {};
  const contentStyle = { width: PHONE_TRACK_PX } satisfies CSSProperties;

  return (
    <>
      <Overview rows={overview}>
        <span
          aria-hidden
          className="absolute inset-y-0 rounded-6 bg-white/6 shadow-[inset_0_0_0_1.5px_#fff] will-change-transform"
          ref={windowRef}
          style={windowStyle}
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
        style={scrollerStyle}
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
