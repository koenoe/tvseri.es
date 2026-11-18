'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import type { Glyph } from '@/components/ui/icon/types';
import cn from '@/lib/cn';

import { FIRST_SECTION, SETTINGS_INDEX } from '../_lib/sections';

/**
 * One settings row: a card with a chevron in the phone list, a
 * sidebar row with the white bar when current. The state
 * line (`children`) streams in from the server.
 */
export default function NavRow({
  children,
  glyph,
  href,
  label,
}: Readonly<{
  children: ReactNode;
  glyph: Glyph;
  href: string;
  label: string;
}>) {
  const pathname = usePathname();
  const isPage = pathname === href;
  // `/settings` from lg is the first section beside the sidebar: its row is
  // drawn current there (the phone's list has no current row)
  const isCurrent =
    isPage || (pathname === SETTINGS_INDEX && href === FIRST_SECTION);
  const current = isPage ? 'page' : undefined;
  const classes = cn(
    'group relative grid grid-cols-[20px_minmax(0,1fr)_16px] items-center gap-x-3 rounded-14 bg-white/4 p-4 text-white transition-[background-color]',
    'lg:grid-cols-[20px_minmax(0,1fr)] lg:rounded-12 lg:bg-transparent lg:px-4 lg:py-3 lg:hover:bg-white/5',
    isCurrent &&
      'lg:bg-white/8 lg:hover:bg-white/8 lg:before:absolute lg:before:top-4 lg:before:bottom-4 lg:before:left-0 lg:before:w-0.75 lg:before:rounded-2 lg:before:bg-white',
  );
  const iconClasses = cn(
    'row-span-2 size-4.5 text-white/60',
    isCurrent && 'lg:text-white',
  );
  return (
    <li>
      <Link aria-current={current} className={classes} href={href}>
        <Icon className={iconClasses} glyph={glyph} size={20} />
        <span className="text-body-sm font-medium">{label}</span>
        <Icon
          className="col-start-3 row-span-2 row-start-1 text-white/60 lg:hidden"
          glyph={chevronRightGlyph}
          size={16}
        />
        <small className="col-start-2 truncate text-caption text-white/60">
          {children}
        </small>
      </Link>
    </li>
  );
}
