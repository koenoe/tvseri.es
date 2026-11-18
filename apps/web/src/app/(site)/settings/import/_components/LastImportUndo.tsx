'use client';

import dynamic from 'next/dynamic';

import type { LastImportState } from '../_lib/lastImport';
import LastImportRow from './LastImportRow';
import UndoneCard from './UndoneCard';

// next/dynamic on purpose: this piece is also rendered on the server, which a client-only loader cannot do.
const UndoDialog = dynamic(() => import('./UndoDialog'));

/**
 * `GET /me`'s last import with Undo (Upload step; the Stopped banner when
 * this tab's import never started): the row, the same confirm dialog as the
 * result, Undoing…, then "Import undone".
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
  if (phase === 'undone') {
    return <UndoneCard />;
  }
  if (!last) {
    return null;
  }
  const askUndo = () => onAsk(true);
  const undoing = phase === 'undoing';
  return (
    <>
      <LastImportRow last={last} onUndo={askUndo} undoing={undoing} />
      {ask ? (
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
