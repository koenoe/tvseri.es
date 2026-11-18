'use client';

import { useLayoutEffect, useRef } from 'react';

type Props = Readonly<{
  /** The overview, or a sub-page (History, Library, Circle) */
  kind: 'overview' | 'subpage';
}>;

/**
 * Says which kind of page this is to the profile frame's CSS (`subpage.ts`,
 * `overviewLayout.ts`): a sub-page's identity drops Watches on, a phone shows
 * the compact identity, the overview's sidebar scrolls with the page. Static,
 * so it is in each page's shell, rendered by the page's `@aside` entry (a
 * slot layout where it has one, so a shelf or month switch never remounts
 * it).
 *
 * The server HTML carries the marker, read by the frame before hydration.
 * From then on it writes `data-profile-page` on the frame as it mounts and
 * each time React's `Activity` shows its page again; a page kept hidden runs
 * no effect, so it never counts.
 */
export default function PageKindMarker({ kind }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const frame = ref.current?.closest<HTMLElement>('[data-profile-frame]');
    if (frame) {
      frame.dataset.profilePage = kind;
    }
  }, [kind]);
  return <span data-profile-marker={kind} hidden ref={ref} />;
}
