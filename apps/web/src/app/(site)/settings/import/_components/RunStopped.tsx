'use client';

import { importedCount, progressOf, type RunState } from '../_lib/importState';
import { runUndoable } from '../_lib/lastImport';
import type { Importer } from '../_lib/useImporter';
import LastImportRow from './LastImportRow';
import LastImportUndo from './LastImportUndo';
import LiveCard from './LiveCard';
import StoppedBanner from './StoppedBanner';

/**
 * Stopped (over the stopped counter), with Undo for
 * what it saved: this tab's import (it undoes through the run, like the
 * result), or the earlier one when this import was never created.
 */
export default function RunStopped({
  importer,
  run,
}: Readonly<{ importer: Importer; run: RunState }>) {
  const imported = importedCount(run);
  const progress = progressOf(run);
  const undoable = runUndoable(run);
  const askUndo = () => importer.askUndo(true);
  const confirmLastUndo = () => void importer.confirmLastUndo();
  const undoing = run.phase === 'undoing';
  return (
    <>
      {run.stopReason ? (
        <StoppedBanner
          onContinue={importer.resume}
          onStartAgain={importer.anotherFile}
          reason={run.stopReason}
          saved={imported}
          total={run.total}
        />
      ) : null}
      {undoable ? (
        <LastImportRow last={undoable} onUndo={askUndo} undoing={undoing} />
      ) : null}
      {!run.importId ? (
        <LastImportUndo
          onAsk={importer.askLastUndo}
          onConfirm={confirmLastUndo}
          state={importer.lastImport}
        />
      ) : null}
      <LiveCard
        current={null}
        imported={imported}
        progress={progress}
        rate={1}
        stopped
        total={run.total}
      />
    </>
  );
}
