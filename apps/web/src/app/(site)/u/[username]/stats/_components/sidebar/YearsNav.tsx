'use client';

import { type MouseEvent, type ReactNode, useRef } from 'react';

import { usePillGlide } from '@/components/motion/usePillGlide';
import { isPlainClick } from '@/lib/navigation/isPlainClick';

import { useSelectedYear, YearPressContext } from './YearLink';

/**
 * The Years list's nav: the URL year's highlight (`[data-pill]`, drawn by
 * `YearLink`) glides from the year that was open to the one pressed, as
 * the Library's shelves do (`usePillGlide`). The rows stay server-drawn.
 */
export default function YearsNav({
  children,
}: Readonly<{ children: ReactNode }>) {
  const nav = useRef<HTMLElement>(null);
  const year = useSelectedYear();
  const pick = usePillGlide(nav, String(year));
  const onPress = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isPlainClick(event)) {
      pick();
    }
  };
  return (
    <YearPressContext value={onPress}>
      <nav aria-label="Years" ref={nav}>
        {children}
      </nav>
    </YearPressContext>
  );
}
