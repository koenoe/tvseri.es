import Link from 'next/link';
import cn from '@/lib/cn';
import { formatGrouped } from '@/lib/formatCount';
import statsPath from '@/lib/routing/statsPath';
import Sparkline from './Sparkline';
import type { YearRow } from './years';

/**
 * The Years submenu: one link per year, newest first, with its
 * sparkline and episode count; the page's year is highlighted. The sidebar
 * and the phone's "More" sheet draw the same list.
 */
export default function YearsList({
  rows,
  selected,
  username,
}: Readonly<{
  rows: ReadonlyArray<YearRow>;
  selected: number;
  username: string;
}>) {
  return (
    <nav aria-label="Years">
      <ul className="-mx-3 flex flex-col gap-0.5">
        {rows.map((row) => (
          <li key={row.year}>
            <YearRowLink
              row={row}
              selected={row.year === selected}
              username={username}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function YearRowLink({
  row,
  selected,
  username,
}: Readonly<{ row: YearRow; selected: boolean; username: string }>) {
  const href = statsPath(username, row.year);
  const classes = cn(
    'grid grid-cols-[92px_minmax(0,1fr)_36px] items-center gap-3 rounded-10 px-3 py-2.5 transition-colors hover:bg-white/5',
    selected && 'bg-white/10',
  );
  return (
    <Link
      aria-current={selected ? 'page' : undefined}
      className={classes}
      href={href}
    >
      <span className="whitespace-nowrap font-semibold text-body-sm">
        {row.label}
      </span>
      <Sparkline currentWeek={row.currentWeek} size="row" values={row.values} />
      <span className="text-right text-caption text-white/60 tabular-nums">
        {formatGrouped(row.episodes)}
      </span>
    </Link>
  );
}
