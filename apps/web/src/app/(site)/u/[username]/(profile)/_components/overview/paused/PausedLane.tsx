'use client';

import { pauseCircleGlyph } from '@/components/ui/icon/glyphs';
import { useHiddenShows } from '@/lib/marking/hooks';

import CappedRows from '../../blocks/CappedRows';
import EmptyState from '../../blocks/EmptyState';
import Lane from '../../blocks/Lane';
import { LANE_CAPS } from '../../blocks/laneCaps';
import PausedRow, { type PausedRowView } from './PausedRow';
import { withoutAnswered } from './pausedCopy';
import { PAUSED_QUESTION, PAUSED_QUESTION_CLASS } from './pausedLayout';
import usePausedAnswers from './usePausedAnswers';

const HIDE_ALL =
  'flex shrink-0 cursor-pointer items-center whitespace-nowrap text-body-sm font-medium text-white/60 transition-colors hover:text-white md:ml-auto';

/**
 * Paused: Not watched in over 3 months. Still watching? Keep or
 * Hide per show, or Hide all. A row leaves at once; if the API refuses, it
 * comes back with a dark toast.
 */
export default function PausedLane({
  emptyLine,
  rows,
}: Readonly<{ emptyLine: string; rows: ReadonlyArray<PausedRowView> }>) {
  const { answer, answered } = usePausedAnswers();
  const hidden = useHiddenShows();
  // a show hidden from in progress anywhere in the tab leaves at once
  const left = withoutAnswered(rows, answered).filter(
    (row) => hidden[row.seriesId] !== true,
  );
  const hideAll = () =>
    answer(
      left.map((row) => row.seriesId),
      'hide',
    );
  const link =
    left.length > 0 ? (
      <button className={HIDE_ALL} onClick={hideAll} type="button">
        Hide all
      </button>
    ) : null;

  if (left.length === 0) {
    return (
      <Lane dot="white" hollow id="paused" title="Paused">
        <EmptyState
          glyph={pauseCircleGlyph}
          sub={emptyLine}
          title="Nothing paused"
        />
      </Lane>
    );
  }
  return (
    <Lane
      count={left.length}
      dot="white"
      id="paused"
      link={link}
      title="Paused"
    >
      <p className={PAUSED_QUESTION_CLASS}>{PAUSED_QUESTION}</p>
      <CappedRows
        cap={LANE_CAPS.paused}
        className="flex flex-col gap-2.5"
        equalRows
        rows={left.map((row) => (
          <PausedRow key={row.seriesId} onAnswer={answer} row={row} />
        ))}
      />
    </Lane>
  );
}
