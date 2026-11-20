'use client';

import dynamic from 'next/dynamic';

import SwapIn from '@/components/motion/SwapIn';
import type { LastImportState } from '../_lib/lastImport';
import LastImportRow from './LastImportRow';
import UndoneCard, { UndoneStatus } from './UndoneCard';

// next/dynamic on purpose: this piece is also rendered on the server, which a client-only loader cannot do.
const UndoDialog = dynamic(() => import('./UndoDialog'));

/**
 * `GET /me`'s last import with Undo (Upload step; the Stopped banner when
 * this tab's import never started): the row, the same confirm dialog as the
 * result, Undoing…, then "Import undone", which rises into the row's place.
 */
export default function LastImportUndo({
  onAsk,
  onConfirm,
  state,
}: Readonly<{
  onAsk: (open: boolean) => void;
  onConfirm: () => void;
  state: LastImportState;
}>) {
  const { ask, last, phase } = state;
  const undone = phase === 'undone';
  const askUndo = () => onAsk(true);
  const undoing = phase === 'undoing';
  const body = undone ? (
    <UndoneCard />
  ) : last ? (
    <LastImportRow last={last} onUndo={askUndo} undoing={undoing} />
  ) : null;
  return (
    <>
      <UndoneStatus undone={undone} />
      {body ? (
        <SwapIn swapKey={undone ? 'undone' : 'row'}>{body}</SwapIn>
      ) : null}
      {!undone && last && ask ? (
        <UndoDialog
          onConfirm={onConfirm}
          onOpenChange={onAsk}
          open={ask}
          written={last.written}
        />
      ) : null}
    </>
  );
}
