'use client';

import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';

import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';
import profilePath from '@/lib/routing/profilePath';

import { PROFILE_TABS, TAB } from './tabs';

/**
 * The tab pills; the active one follows the URL (a soft navigation keeps
 * the layout, so only this island re-renders). `segments` are the tabs this
 * profile shows (`visibleTabs`).
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
    </>
  );
}
