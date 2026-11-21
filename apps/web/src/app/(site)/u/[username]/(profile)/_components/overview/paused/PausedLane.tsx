'use client';

import { useState } from 'react';
import { HEAD_LINK } from '@/app/(site)/u/[username]/_lib/headLink';
import SwapIn from '@/components/motion/SwapIn';
import { pauseCircleGlyph } from '@/components/ui/icon/glyphs';
import cn from '@/lib/cn';
import { useHiddenShows } from '@/lib/marking/hooks';
import CappedRows from '../../blocks/CappedRows';
import EmptyState from '../../blocks/EmptyState';
import Lane, { LANE_BODY } from '../../blocks/Lane';
import { LANE_CAPS } from '../../blocks/laneCaps';
import { focusLaneHeading } from '../../blocks/rowFocus';
import useSettledEmpty from '../../blocks/useSettledEmpty';
import PausedRow, { type PausedRowView } from './PausedRow';
import { withoutAnswered } from './pausedCopy';
import { PAUSED_QUESTION, PAUSED_QUESTION_CLASS } from './pausedLayout';
import usePausedAnswers from './usePausedAnswers';

const HIDE_ALL = cn(HEAD_LINK, 'shrink-0 cursor-pointer');

const LANE_ID = 'paused';

/**
 * Paused: not watched in over 3 months. Still watching? Keep or Hide per
 * show, or Hide all. An answered row folds out without waiting for the API
 * (the owner's choice: the rows under it close up rather than jump); if
 * the API refuses, it comes back with an error toast. Hide all sweeps the
 * rows out one after another, and "Nothing paused" rises in once the last
 * has gone.
 */
export default function PausedLane({
  emptyLine,
  rows,
}: Readonly<{ emptyLine: string; rows: ReadonlyArray<PausedRowView> }>) {
  const { answer, answered, hideAll: hideShows } = usePausedAnswers();
  const hidden = useHiddenShows();
  const [sweeping, setSweeping] = useState(false);
  // a show hidden from in progress anywhere in the tab leaves too
  const left = withoutAnswered(rows, answered).filter(
    (row) => hidden[row.seriesId] !== true,
  );
  const { empty, onSettled } = useSettledEmpty(left.length);
  const settled = () => {
    setSweeping(false);
    onSettled();
  };
  const hideAll = () => {
    setSweeping(true);
    const taken = hideShows(left.map((row) => row.seriesId));
    // Hide all goes with the last rows: focus waits on the lane's heading
    if (taken.length === left.length) {
      focusLaneHeading(document.getElementById(LANE_ID));
    }
  };
  const link =
    left.length > 0 ? (
      <button className={HIDE_ALL} onClick={hideAll} type="button">
        Hide all
      </button>
    ) : null;
  const pausedRows = left.map((row) => (
    <PausedRow key={row.seriesId} onAnswer={answer} row={row} />
  ));
  const body = empty ? (
    <EmptyState
      glyph={pauseCircleGlyph}
      sub={emptyLine}
      title="Nothing paused"
    />
  ) : (
    <>
      <p className={PAUSED_QUESTION_CLASS}>{PAUSED_QUESTION}</p>
      <CappedRows
        cap={LANE_CAPS.paused}
        equalRows
        gap="2.5"
        onSettled={settled}
        rows={pausedRows}
        sweeping={sweeping}
      />
    </>
  );
  const swapKey = empty ? 'empty' : 'rows';
  return (
    <Lane
      count={left.length}
      dot="white"
      hollow={empty}
      id={LANE_ID}
      link={link}
      title="Paused"
    >
      <SwapIn className={LANE_BODY} swapKey={swapKey}>
        {body}
      </SwapIn>
    </Lane>
  );
}
