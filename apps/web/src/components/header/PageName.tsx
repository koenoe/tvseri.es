'use client';

import { useEffect, useRef } from 'react';

import { usePageNameStore } from './pageNameStore';
import { PHONE_BAR_HEIGHT } from './phoneBar';

/**
 * Put right after a page's title: on a phone the
 * header shows `name` in place of the logo once the title has scrolled away.
 * Draws nothing and takes no room: a zero-size marker watched by one
 * IntersectionObserver, so scrolling runs no script.
 */
export default function PageName({ name }: Readonly<{ name: string }>) {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = marker.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const { set, setTitleAway } = usePageNameStore.getState();
    set(name, false);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          // Under the bar, not below the screen. The observer reports only
          // the crossing of the bar's line, so the title is away from there.
          setTitleAway(
            !entry.isIntersecting &&
              entry.boundingClientRect.top < PHONE_BAR_HEIGHT,
          );
        }
      },
      { rootMargin: `-${PHONE_BAR_HEIGHT}px 0px 0px 0px` },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      // a page that was left after the next one set its name leaves it be
      if (usePageNameStore.getState().name === name) {
        usePageNameStore.getState().set(null, false);
      }
    };
  }, [name]);

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute size-px"
      ref={marker}
    />
  );
}
