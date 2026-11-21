'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createContext, type MouseEvent, type ReactNode, use } from 'react';

import { YEAR_SWITCH_TYPES } from '../../_lib/yearSwitch';

/** The year in the URL (`[year]` under this layout), or null */
export function useSelectedYear(): number | null {
  const { year } = useParams<{ year?: string }>();
  return year ? Number(year) : null;
}

type Press = (event: MouseEvent<HTMLAnchorElement>) => void;

/**
 * A year link was pressed: its list's highlight glides to it (`YearsNav`,
 * `YearPills`)
 */
export const YearPressContext = createContext<Press>(() => {});

/**
 * One year's link in the sidebar, the pill row or the sheet. The sidebar
 * lives in the Stats layout, so a year switch keeps it mounted and only this
 * island follows the URL: the year in it is the highlighted one, from the
 * moment the switch starts. The server draws both looks (`className`,
 * `selectedClassName`) and the content. A switch opens the new year at the
 * top of the page, as every new page does (`NavigationTracker`).
 */
export default function YearLink({
  children,
  className,
  href,
  pill = null,
  selectedClassName,
  year,
}: Readonly<{
  children: ReactNode;
  className: string;
  href: string;
  /** The highlight that glides between rows (`YearsNav`), drawn while selected */
  pill?: ReactNode;
  selectedClassName: string;
  year: number;
}>) {
  const selected = useSelectedYear() === year;
  const onPress = use(YearPressContext);
  return (
    <Link
      aria-current={selected ? 'page' : undefined}
      className={selected ? selectedClassName : className}
      href={href}
      onClick={onPress}
      transitionTypes={YEAR_SWITCH_TYPES}
    >
      {selected ? pill : null}
      {children}
    </Link>
  );
}
