'use client';

import { type ReactNode, useEffect, useState } from 'react';

import cn from '@/lib/cn';

import styles from './weekGrow.module.css';

/**
 * The year last shown on this page, kept across client navigations (a page
 * of another year is a new instance). Null until a Stats page has mounted,
 * so a page load or a first visit never animates.
 */
let lastYear: number | null = null;

/**
 * The year, its sentence, the week lines and the six numbers. When this
 * block arrives from another year's page, its week lines grow from the
 * baseline (`weekGrow.module.css`: from 0 with an 8ms stagger); the numbers cross-fade through the view
 * transition around it (StatsBody).
 */
export default function YearGlance({
  children,
  label,
  year,
}: Readonly<{ children: ReactNode; label: string; year: number }>) {
  // Read once, while rendering: the class has to be there when the lines are
  // inserted. The server and a page load render `null`.
  const [grow] = useState(() => lastYear !== null && lastYear !== year);
  useEffect(() => {
    lastYear = year;
  }, [year]);
  const className = cn('flex flex-col md:gap-6', grow && styles.grow);
  return (
    <section aria-label={label} className={className}>
      {children}
    </section>
  );
}
