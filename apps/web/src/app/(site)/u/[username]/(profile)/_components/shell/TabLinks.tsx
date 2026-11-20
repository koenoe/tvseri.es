'use client';

import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';

import { useLinkGlide } from '@/components/motion/fillGlide';
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
    const row = marker.current?.closest<HTMLElement>('[data-tab-scroller]');
    const tab = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !tab) {
      return;
    }
    const left = activeTabScroll({
      clientWidth: row.clientWidth,
      first: !tab.previousElementSibling,
      left: tab.offsetLeft,
      scrollWidth: row.scrollWidth,
      width: tab.offsetWidth,
    });
    if (placed.current) {
      row.scrollTo({ behavior: scrollBehavior(), left });
    } else {
      row.scrollLeft = left;
    }
    placed.current = true;
  }, [segment]);
  return marker;
}

/**
 * The tab pills; the active one follows the URL (a soft navigation keeps
 * the layout, so only this island re-renders). Every profile shows all six:
 * an empty page says how it fills. A tab opens at the top of the page, as
 * every new page does (`NavigationTracker`).
 */
export default function TabLinks({
  statsHref,
  username,
}: Readonly<{
  statsHref: string;
  username: string;
}>) {
  const selected = useSelectedLayoutSegment();
  // The overview is the layout's own page (null, or `__PAGE__` in some versions)
  const segment = !selected || selected.startsWith('__') ? '' : selected;
  const marker = useActiveInView(segment);
  // the highlight glides from the tab that was open to the one pressed
  const onPress = useLinkGlide(
    () => marker.current?.closest<HTMLElement>('[data-tab-scroller]'),
    segment,
  );
  return (
    <>
      {PROFILE_TABS.map((tab) => {
        const active = tab.segment === segment;
        const href =
          tab.segment === 'stats'
            ? statsHref
            : profilePath(username, tab.segment);
        const className = cn(
          TAB,
          active
            ? 'text-white before:bg-white/15'
            : 'text-white/60 hover:bg-white/8 hover:text-white',
        );
        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={className}
            href={href}
            key={tab.label}
            onClick={onPress}
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
