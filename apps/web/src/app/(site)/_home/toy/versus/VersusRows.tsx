import type { VersusPair } from '@tvseri.es/schemas';

import cn from '@/lib/cn';

import { VERSUS_ROW, VERSUS_ROWS_LIST, VERSUS_VALUE } from './layout';
import RowLabel from './RowLabel';
import { type CompareRow, compareRows, type Side } from './rows';

/**
 * The higher value white and bold, the other at 60%, the site's contrast
 * floor. Choosing a side dims only its rival's poster: on top of the 60%
 * step a dim here would drop the values under AA.
 */
const valueClass = (row: CompareRow, side: Side) =>
  cn(
    VERSUS_VALUE[side],
    row.winner === side && 'font-bold text-white',
    row.winner && row.winner !== side && 'text-white/60',
  );

function Row({ row }: Readonly<{ row: CompareRow }>) {
  const left = valueClass(row, 'left');
  const right = valueClass(row, 'right');
  return (
    <div className={VERSUS_ROW} role="row">
      <span className={left} role="cell">
        {row.left}
      </span>
      <RowLabel label={row.label} role="rowheader" />
      <span className={right} role="cell">
        {row.right}
      </span>
    </div>
  );
}

/**
 * The comparison: Score, Seasons, Episodes, On air, the
 * left series' value right-aligned, the label, the right one's value. A
 * table to assistive tech, each label its row's header.
 */
export default function VersusRows({ pair }: Readonly<{ pair: VersusPair }>) {
  const rows = compareRows(pair);
  const name = `${pair.left.title} and ${pair.right.title}`;
  return (
    <div aria-label={name} className={VERSUS_ROWS_LIST} role="table">
      {rows.map((row) => (
        <Row key={row.label} row={row} />
      ))}
    </div>
  );
}
