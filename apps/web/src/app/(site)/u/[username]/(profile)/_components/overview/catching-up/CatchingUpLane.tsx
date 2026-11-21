'use client';

import type { CatchingUpItem } from '@tvseri.es/schemas';
import { type ReactNode, useMemo } from 'react';

import SwapIn from '@/components/motion/SwapIn';
import { useHiddenShows } from '@/lib/marking/hooks';

import CappedRows from '../../blocks/CappedRows';
import Lane, { LANE_BODY } from '../../blocks/Lane';
import { LANE_CAPS } from '../../blocks/laneCaps';
import useSettledEmpty from '../../blocks/useSettledEmpty';
import CatchingUpRow from '../lane-rows/CatchingUpRow';
import useLiveCatchingUp from './useLiveCatchingUp';

/** A show waiting, with Next up's label as the server has it */
type CatchingUpRowView = Readonly<{
  item: CatchingUpItem;
  nextUp: string;
}>;

/**
 * Catching up as the viewer's marks in this tab have it: a show caught up
 * (or hidden from in progress anywhere in the tab) folds out of the lane,
 * the count follows the rows still waiting, and the empty state (`empty`,
 * the server's line) rises in once the last row has gone.
 */
export default function CatchingUpLane({
  empty: emptyState,
  rows,
}: Readonly<{ empty: ReactNode; rows: ReadonlyArray<CatchingUpRowView> }>) {
  const items = useMemo(() => rows.map((row) => row.item), [rows]);
  const live = useLiveCatchingUp(items);
  const hidden = useHiddenShows();
  const left = rows.flatMap((row, index) => {
    const now = live[index];
    return now && hidden[row.item.seriesId] !== true ? [{ ...row, now }] : [];
  });
  const { empty, onSettled } = useSettledEmpty(left.length);
  const laneRows = left.map((row) => (
    <CatchingUpRow
      item={row.item}
      key={row.item.seriesId}
      live={row.now}
      nextUp={row.nextUp}
    />
  ));
  const body = empty ? (
    emptyState
  ) : (
    <CappedRows
      as="ul"
      cap={LANE_CAPS.catchingUp}
      gap="3.5"
      onSettled={onSettled}
      rows={laneRows}
    />
  );
  const swapKey = empty ? 'empty' : 'rows';
  return (
    <Lane
      count={left.length}
      dot="cyan"
      hollow={empty}
      id="b-catch"
      title="Catching up"
    >
      <SwapIn className={LANE_BODY} swapKey={swapKey}>
        {body}
      </SwapIn>
    </Lane>
  );
}
