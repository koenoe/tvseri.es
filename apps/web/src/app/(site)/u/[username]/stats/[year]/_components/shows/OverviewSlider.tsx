'use client';

import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useRef,
} from 'react';

import {
  grabOffset,
  PHONE_WEEK_PX,
  scrollForWindow,
  sliderWeek,
} from './model';

/** Snapping off while the slider moves the scroller, back on after */
const snap = (scroller: HTMLElement, on: boolean) => {
  scroller.style.scrollSnapType = on ? '' : 'none';
};

const jump = (scroller: HTMLElement, left: number) =>
  scroller.scrollTo({ behavior: 'instant', left });

type Grab = Readonly<{ offset: number; origin: number; track: number }>;

/**
 * The overview's window as a slider over the whole strip: drag the window,
 * or press anywhere on the strip to bring the window there (centred on the
 * pointer) and keep dragging; the arrows, PageUp, PageDown, Home and End
 * move it from the keyboard. It scrolls the rows' scroller and nothing
 * else: the scroller's own listener moves the window and lights the
 * quarter. Snapping is off while it moves and comes back on release (a key
 * move: on blur). Vertical touch moves still scroll the page.
 *
 * Its value (the first week in view) and the months in view are written by
 * the scroller's listener, not by React: `initial` is the server's guess.
 */
export default function OverviewSlider({
  initial,
  onGrab,
  ref,
  scrollerRef,
  windowRef,
  windowStyle,
}: Readonly<{
  initial: Readonly<{ last: number; now: number; text: string }>;
  /** A drag or key takes over from a tapped quarter's scroll */
  onGrab: () => void;
  ref: RefObject<HTMLDivElement | null>;
  scrollerRef: RefObject<HTMLDivElement | null>;
  windowRef: RefObject<HTMLSpanElement | null>;
  windowStyle: CSSProperties;
}>) {
  const grabRef = useRef<Grab | null>(null);

  const scrubTo = (grab: Grab, clientX: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    const max = scroller.scrollWidth - scroller.clientWidth;
    const left = clientX - grab.origin - grab.offset;
    jump(scroller, scrollForWindow(left, grab.track, max));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    const frame = windowRef.current;
    if (!scroller || !frame || !event.isPrimary || event.button !== 0) {
      return;
    }
    const strip = event.currentTarget.getBoundingClientRect();
    const box = frame.getBoundingClientRect();
    const grab = {
      offset: grabOffset(
        event.clientX - strip.left,
        box.left - strip.left,
        box.width,
      ),
      origin: strip.left,
      track: strip.width,
    };
    grabRef.current = grab;
    event.currentTarget.setPointerCapture(event.pointerId);
    onGrab();
    snap(scroller, false);
    scrubTo(grab, event.clientX);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const grab = grabRef.current;
    if (grab) {
      scrubTo(grab, event.clientX);
    }
  };

  const release = () => {
    const scroller = scrollerRef.current;
    if (grabRef.current && scroller) {
      snap(scroller, true);
    }
    grabRef.current = null;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    const max = scroller.scrollWidth - scroller.clientWidth;
    const week = sliderWeek(
      event.key,
      Math.round(scroller.scrollLeft / PHONE_WEEK_PX),
      Math.ceil(max / PHONE_WEEK_PX),
    );
    if (week === null) {
      return;
    }
    event.preventDefault();
    onGrab();
    snap(scroller, false);
    jump(scroller, Math.min(week * PHONE_WEEK_PX, max));
  };

  const onBlur = () => {
    const scroller = scrollerRef.current;
    if (scroller && !grabRef.current) {
      snap(scroller, true);
    }
  };

  return (
    <div
      aria-label="Weeks in view"
      aria-valuemax={initial.last}
      aria-valuemin={0}
      aria-valuenow={initial.now}
      aria-valuetext={initial.text}
      className="absolute inset-0 cursor-grab touch-pan-y select-none rounded-6 outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 active:cursor-grabbing"
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onLostPointerCapture={release}
      onPointerCancel={release}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      ref={ref}
      role="slider"
      tabIndex={0}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 rounded-6 bg-white/6 shadow-[inset_0_0_0_1.5px_#fff] will-change-transform"
        ref={windowRef}
        style={windowStyle}
      />
    </div>
  );
}
