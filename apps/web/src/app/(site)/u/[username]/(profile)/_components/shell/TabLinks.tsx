'use client';

import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';

import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';
import scrollBehavior from '@/lib/media/scrollBehavior';
import profilePath from '@/lib/routing/profilePath';

import { activeTabScroll, PROFILE_TABS, TAB } from './tabs';

/**
 * The phone's row keeps the active tab in view (`activeTabScroll`): in
 * place on the first paint, smoothly when another tab opens
 */
function useActiveInView(segment: string) {
  const marker = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the active tab changes, reading the row it drew
  useLayoutEffect(() => {
    const nav = marker.current?.closest('nav');
    const tab = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !tab) {
      return;
    }
    const left = activeTabScroll({
      clientWidth: nav.clientWidth,
      first: !tab.previousElementSibling,
      left: tab.offsetLeft,
      scrollWidth: nav.scrollWidth,
      width: tab.offsetWidth,
    });
    if (placed.current) {
      nav.scrollTo({ behavior: scrollBehavior(), left });
    } else {
      nav.scrollLeft = left;
    }
    placed.current = true;
  }, [segment]);
  return marker;
}

/**
 * The tab pills; the active one follows the URL (a soft navigation keeps
 * the layout, so only this island re-renders). `segments` are the tabs this
 * profile shows (`visibleTabs`). A tab opens at the top of the page, as every
 * new page does (`NavigationTracker`).
 */
export default function TabLinks({
  segments,
  statsHref,
  username,
}: Readonly<{
  segments: ReadonlyArray<string>;
  statsHref: string;
  username: string;
}>) {
  const selected = useSelectedLayoutSegment();
  // The overview is the layout's own page (null, or `__PAGE__` in some versions)
  const segment = !selected || selected.startsWith('__') ? '' : selected;
  const tabs = PROFILE_TABS.filter((tab) => segments.includes(tab.segment));
  const marker = useActiveInView(segment);
  return (
    <>
      {tabs.map((tab) => {
        const active = tab.segment === segment;
        const href =
          tab.segment === 'stats'
            ? statsHref
            : profilePath(username, tab.segment);
        const className = cn(
          TAB,
          active
            ? 'bg-white/15 text-white'
            : 'text-white/60 hover:bg-white/8 hover:text-white',
        );
        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={className}
            href={href}
            key={tab.label}
          >
            <Icon glyph={tab.glyph} size={16} />
            {tab.label}
          </Link>
        );
      })}
      {/* finds the row the tabs scroll in */}
      <span hidden ref={marker} />
    </>
  );
}
