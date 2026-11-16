'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import { assumedDatesLine } from '../_lib/copy';
import { filmsLine, filmTitles } from '../_lib/films';
import {
  type ImportStep as ImportState,
  writtenCount,
} from '../_lib/importState';
import { dateExampleOf } from '../_lib/previewTable';
import type { Importer } from '../_lib/useImporter';
import DatesNote from './DatesNote';
import ProblemGroups from './ProblemGroups';
import RunLive from './RunLive';
import RunResult from './RunResult';
import RunStopped from './RunStopped';
import UndoneCard from './UndoneCard';

// next/dynamic on purpose: this piece is also rendered on the server, which a client-only loader cannot do.
const UndoDialog = dynamic(() => import('./UndoDialog'));

/**
 * Step 3: the live counter, then the result (or the
 * Stopped banner, or "Import undone"), the problems to sort out and the
 * dates note. Loaded when the import starts, not with the page.
 */
export default function ImportStep({
  importer,
  state,
  username,
}: Readonly<{ importer: Importer; state: ImportState; username: string }>) {
  const { file, mapping, prepared, run, source } = state;
  const films = useMemo(
    () => filmsLine(filmTitles(file.rows, mapping), prepared.skipped.films),
    [file.rows, mapping, prepared.skipped.films],
  );
  const example = useMemo(
    () => dateExampleOf(file.rows, mapping, prepared.dateOrder),
    [file.rows, mapping, prepared.dateOrder],
  );
  const datesNote = assumedDatesLine(
    source,
    prepared.dateOrder,
    prepared.hasAssumedDates,
    example,
  );

  if (run.phase === 'undone') {
    return <UndoneCard onStartAgain={importer.anotherFile} />;
  }
  const isLive = run.phase === 'starting' || run.phase === 'running';
  // Undo keeps the screen it was asked from: the result or the Stopped banner
  const fromStop = run.stopReason !== null;
  const isStopped =
    fromStop && (run.phase === 'stopped' || run.phase === 'undoing');
  const isResult =
    !fromStop && (run.phase === 'done' || run.phase === 'undoing');
  const setUndoOpen = (open: boolean) => importer.askUndo(open);
  const confirmUndo = () => void importer.confirmUndo();
  const written = writtenCount(run);
  return (
    <>
      {isLive ? <RunLive run={run} /> : null}
      {isStopped ? <RunStopped importer={importer} run={run} /> : null}
      {isResult ? (
        <RunResult
          importer={importer}
          run={run}
          source={source}
          username={username}
        />
      ) : null}
      <ProblemGroups filmsTitle={films} importer={importer} state={state} />
      {datesNote ? <DatesNote>{datesNote}</DatesNote> : null}
      {run.undoAsk ? (
        <UndoDialog
          onConfirm={confirmUndo}
          onOpenChange={setUndoOpen}
          open={run.undoAsk}
          written={written}
        />
      ) : null}
    </>
  );
}
