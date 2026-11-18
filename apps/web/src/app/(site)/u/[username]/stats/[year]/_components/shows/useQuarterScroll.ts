'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import scrollBehavior from '@/lib/media/scrollBehavior';

import {
  activeQuarter,
  monthsInView,
  PHONE_TRACK_PX,
  PHONE_WEEK_PX,
  quarterStarts,
} from './model';

/**
 * A row's pointer shows once its whole line is out of view: before the
 * first week in view or after the last. A flag on just the pointers, set
 * only when it changes: an inherited custom property on the scroller
 * restyled every row under it (400+ elements) every scroll frame.
 */
function showPointers(scroller: HTMLElement) {
  const from = scroller.scrollLeft / PHONE_WEEK_PX;
  const to = (scroller.scrollLeft + scroller.clientWidth) / PHONE_WEEK_PX;
  for (const pointer of scroller.querySelectorAll<HTMLElement>(
    '[data-before]',
  )) {
    pointer.toggleAttribute('data-out', from >= Number(pointer.dataset.before));
  }
  for (const pointer of scroller.querySelectorAll<HTMLElement>(
    '[data-after]',
  )) {
    pointer.toggleAttribute('data-out', to <= Number(pointer.dataset.after));
  }
}

/**
 * The quarter scroller's scroll: the opening quarter, one passive scroll
 * listener a frame for the overview window, pointers, edges, slider value
 * and the quarter in view, and `select` / `grab` for the switch and the
 * overview's slider.
 */
export default function useQuarterScroll(opening: number, year: number) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLSpanElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  // The quarter a tap scrolls to: it stays lit on the way there
  const targetRef = useRef<number | null>(null);
  const [quarter, setQuarter] = useState(opening);
  const [scrolls, setScrolls] = useState(false);
  const starts = quarterStarts(year).map((week) => week * PHONE_WEEK_PX);

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
      showPointers(scroller);
      scroller.toggleAttribute('data-fl', x > 1);
      scroller.toggleAttribute('data-fr', x < max - 1);
      const scale =
        (frame.parentElement?.clientWidth ?? width) / PHONE_TRACK_PX;
      frame.style.left = '0';
      frame.style.width = `${width * scale}px`;
      frame.style.transform = `translateX(${x * scale}px)`;
      const slider = sliderRef.current;
      if (slider) {
        const from = x / PHONE_WEEK_PX;
        const value = {
          'aria-valuemax': Math.ceil(max / PHONE_WEEK_PX),
          'aria-valuenow': Math.round(from),
          'aria-valuetext': monthsInView(
            from,
            from + width / PHONE_WEEK_PX,
            year,
          ),
        };
        for (const [name, text] of Object.entries(value)) {
          slider.setAttribute(name, String(text));
        }
      }
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

  // Rows that mount or move without a scroll (All N, a re-sort) get their
  // pointers before they paint
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller && scroller.clientWidth > 0) {
      showPointers(scroller);
    }
  });

  // a drag or key on the overview takes over from a tap's scroll
  const grab = () => {
    targetRef.current = null;
  };

  const select = (next: number) => {
    const scroller = scrollerRef.current;
    setQuarter(next);
    if (!scroller) {
      return;
    }
    const max = scroller.scrollWidth - scroller.clientWidth;
    targetRef.current = next;
    scroller.scrollTo({
      behavior: scrollBehavior(),
      left: Math.min(starts[next] ?? 0, max),
    });
  };

  return {
    grab,
    quarter,
    scrollerRef,
    scrolls,
    select,
    sliderRef,
    starts,
    windowRef,
  };
}
