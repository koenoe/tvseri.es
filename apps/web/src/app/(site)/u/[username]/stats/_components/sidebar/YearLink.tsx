'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';

import toTopOnPress from '@/lib/routing/toTopOnPress';

/** The year in the URL (`[year]` under this layout), or null */
export function useSelectedYear(): number | null {
  const { year } = useParams<{ year?: string }>();
  return year ? Number(year) : null;
}

/**
 * One year's link in the sidebar, the pill row or the sheet. The sidebar
 * lives in the Stats layout, so a year switch keeps it mounted and only this
 * island follows the URL: the year in it is the highlighted one, from the
 * moment the switch starts. The server draws both looks (`className`,
 * `selectedClassName`) and the content. A switch opens the new year at the
 * top of the page (the sidebar is sticky, the pills sit at the top).
 */
export default function YearLink({
  children,
  className,
  href,
  selectedClassName,
  year,
}: Readonly<{
  children: ReactNode;
  className: string;
  href: string;
  selectedClassName: string;
  year: number;
}>) {
  const selected = useSelectedYear() === year;
  return (
    <Link
      aria-current={selected ? 'page' : undefined}
      className={selected ? selectedClassName : className}
      href={href}
      onClick={toTopOnPress}
      scroll={false}
    >
      {children}
    </Link>
  );
}
