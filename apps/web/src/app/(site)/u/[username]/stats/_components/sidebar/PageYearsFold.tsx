'use client';

import type { ReactNode } from 'react';

import YearsFold from '@/components/ui/fold/YearsFold';

import { useSelectedYear } from './YearLink';

/**
 * The sidebar's Years rows, folded around the page's year, which follows
 * the URL like the highlight does
 */
export default function PageYearsFold({
  className,
  rows,
}: Readonly<{
  className: string;
  rows: ReadonlyArray<Readonly<{ year: number; row: ReactNode }>>;
}>) {
  const selected = useSelectedYear();
  return <YearsFold className={className} rows={rows} selected={selected} />;
}
