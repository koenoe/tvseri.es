import type { VersusPair } from '@tvseri.es/schemas';

import cn from '@/lib/cn';

import { VERSUS_ROW, VERSUS_ROWS, VERSUS_VALUE } from './layout';
import RowLabel from './RowLabel';
import { type CompareRow, compareRows, type Side } from './rows';

const FADE = 'transition-opacity duration-[250ms] ease-[ease]';

/** HMFinal `e2-w` / `e2-l`: the higher value white and bold, the other at 60% (the site's contrast floor; the board's 50%); the side not chosen at 40% */
const valueClass = (row: CompareRow, side: Side, chosen: Side | null) =>
  cn(
    VERSUS_VALUE[side],
    FADE,
    row.winner === side && 'font-bold text-white',
    row.winner && row.winner !== side && 'text-white/60',
    chosen && chosen !== side && 'opacity-40',
  );

function Row({
  chosen,
  row,
}: Readonly<{ chosen: Side | null; row: CompareRow }>) {
  const left = valueClass(row, 'left', chosen);
  const right = valueClass(row, 'right', chosen);
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
 * The comparison (HMFinal `e2-vr`): Score, Seasons, Episodes, On air, the
 * left series' value right-aligned, the label, the right one's value; the
 * side not chosen dims with its poster. A table to assistive tech, each
 * label its row's header.
 */
export default function VersusRows({
  chosen,
  pair,
}: Readonly<{ chosen: Side | null; pair: VersusPair }>) {
  const rows = compareRows(pair);
  const name = `${pair.left.title} and ${pair.right.title}`;
  return (
    <div aria-label={name} className={VERSUS_ROWS} role="table">
      {rows.map((row) => (
        <Row chosen={chosen} key={row.label} row={row} />
      ))}
    </div>
  );
}
