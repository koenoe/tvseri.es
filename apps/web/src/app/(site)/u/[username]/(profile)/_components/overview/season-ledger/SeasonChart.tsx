import cn from '@/lib/cn';

import { LEDGER_CHART, LEDGER_SEASON } from './ledgerLayout';

import {
  chartColumns,
  chartLabel,
  type Hole,
  type HoleState,
  seasonRuns,
} from './ledgerLines';
import type { LedgerView } from './loadLedger';

type Props = Readonly<{
  /** The state of each missing episode, by `S08E05` code (open until changed) */
  states: Readonly<Record<string, HoleState>>;
  view: LedgerView;
}>;

function holesOf(view: LedgerView, season: number, states: Props['states']) {
  return view.episodes
    .filter((episode) => episode.season === season)
    .map(
      (episode): Hole => ({
        episode: episode.episode,
        state: states[episode.code] ?? 'open',
      }),
    );
}

function Season({
  holes,
  number,
  total,
  unaired,
}: Readonly<{
  holes: ReadonlyArray<Hole>;
  number: number;
  total: number;
  unaired: boolean;
}>) {
  const open = holes.some((hole) => hole.state === 'open');
  const runs = unaired ? [] : seasonRuns(total, holes);
  const watched = open ? 'bg-white/90' : 'bg-white/38';
  const numberClass = cn(
    'w-4 shrink-0 text-right text-caption font-medium tabular-nums transition-colors',
    open ? 'font-semibold text-white' : 'text-white/60',
  );
  // the track: a season you never logged still draws its line, faintly
  // (skipped stretches and unaired seasons a step brighter)
  const lineClass = cn(
    'relative h-1 flex-1 overflow-hidden rounded-2',
    unaired ? 'bg-white/12' : 'bg-white/6',
  );
  return (
    <span className={LEDGER_SEASON}>
      <span className={numberClass}>{number}</span>
      <span className={lineClass}>
        {runs.map((run) => {
          const style = { left: `${run.left}%`, width: `${run.width}%` };
          const runClass = cn(
            'absolute inset-y-0 transition-colors',
            run.tone === 'skipped' ? 'bg-white/12' : watched,
          );
          return <i className={runClass} key={run.left} style={style} />;
        })}
      </span>
    </span>
  );
}

/**
 * Each season is one numbered line (two columns from five seasons on); a
 * hole is a gap in its line, and the season's number lights up while it is
 * open. Watching or skipping a hole closes the gap.
 */
export default function SeasonChart({ states, view }: Props) {
  const open = view.episodes.filter(
    (episode) => (states[episode.code] ?? 'open') === 'open',
  ).length;
  const columns = chartColumns(view.seasonCount);
  const grid = cn(
    LEDGER_CHART,
    columns.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
  );
  const label = chartLabel(view.seasonCount, open);
  return (
    <div aria-label={label} className={grid} role="img">
      {columns.map((column) => (
        <span className="flex flex-col" key={column[0]}>
          {column.map((number) => {
            const holes = holesOf(view, number, states);
            const total = view.totals[number] ?? 1;
            const unaired = view.unaired.includes(number);
            return (
              <Season
                holes={holes}
                key={number}
                number={number}
                total={total}
                unaired={unaired}
              />
            );
          })}
        </span>
      ))}
    </div>
  );
}
