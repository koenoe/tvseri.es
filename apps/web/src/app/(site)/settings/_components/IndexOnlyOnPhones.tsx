'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import cn from '@/lib/cn';

import { SETTINGS_INDEX } from '../_lib/sections';

/**
 * Below `lg` (phones and tablets) the header and the section list show only
 * on `/settings` (a section "pushes in" under its own top bar);
 * with the sidebar (`lg`) they always show.
 */
export default function IndexOnlyOnPhones({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  const isIndex = usePathname() === SETTINGS_INDEX;
  const classes = cn(className, !isIndex && 'max-lg:hidden');
  return <div className={classes}>{children}</div>;
}
