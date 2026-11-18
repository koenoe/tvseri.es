import { formatGrouped } from '@tvseri.es/utils';
import cn from '@/lib/cn';
import statsPath from '@/lib/routing/statsPath';
import Sparkline from './Sparkline';
import YearLink from './YearLink';
import YearsFold from './YearsFold';
import type { YearRow } from './years';

const ROW =
  'grid grid-cols-[92px_minmax(0,1fr)_36px] items-center gap-3 rounded-10 px-3 py-2.5 transition-colors hover:bg-white/5';
const SELECTED_ROW = cn(ROW, 'bg-white/10');

const LIST = '-mx-3 flex flex-col gap-0.5';

/**
 * The Years submenu: one link per year, newest first, with its
 * sparkline and episode count; the URL's year is highlighted (`YearLink`).
 * The sidebar and the phone's "More" sheet draw the same list. The sidebar
 * folds it (`YearsFold`); the sheet is already the "all years" view.
 */
export default function YearsList({
  fold = false,
  rows,
  username,
}: Readonly<{
  fold?: boolean;
  rows: ReadonlyArray<YearRow>;
  username: string;
}>) {
  const links = rows.map((row) => ({
    row: <YearRowLink row={row} username={username} />,
    year: row.year,
  }));
  return (
    <nav aria-label="Years">
      {fold ? (
        <YearsFold className={LIST} rows={links} />
      ) : (
        <ul className={LIST}>
          {links.map((item) => (
            <li key={item.year}>{item.row}</li>
          ))}
        </ul>
      )}
    </nav>
  );
}

function YearRowLink({
  row,
  username,
}: Readonly<{ row: YearRow; username: string }>) {
  const href = statsPath(username, row.year);
  return (
    <YearLink
      className={ROW}
      href={href}
      selectedClassName={SELECTED_ROW}
      year={row.year}
    >
      <span className="whitespace-nowrap font-semibold text-body-sm">
        {row.label}
      </span>
      <Sparkline currentWeek={row.currentWeek} size="row" values={row.values} />
      <span className="text-right text-caption text-white/60 tabular-nums">
        {formatGrouped(row.episodes)}
      </span>
    </YearLink>
  );
}
