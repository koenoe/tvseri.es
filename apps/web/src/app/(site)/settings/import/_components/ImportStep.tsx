'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import SwapIn from '@/components/motion/SwapIn';

import { assumedDatesLine } from '../_lib/copy';
import { filmsLine, filmTitles } from '../_lib/films';
import {
  type ImportStep as ImportState,
  type RunState,
  writtenCount,
} from '../_lib/importState';
import { dateExampleOf } from '../_lib/previewTable';
import type { Importer } from '../_lib/useImporter';
import DatesNote from './DatesNote';
import ProblemGroups from './ProblemGroups';
import RunLive from './RunLive';
import RunResult from './RunResult';
import RunStopped from './RunStopped';
import UndoneCard, { UndoneStatus } from './UndoneCard';

// next/dynamic on purpose: this piece is also rendered on the server, which a client-only loader cannot do.
const UndoDialog = dynamic(() => import('./UndoDialog'));

type Stage = 'live' | 'result' | 'stopped' | 'undone';

/**
 * The lead's swap: the result arrives in its own steps (`ResultCard`), so it
 * takes the live counter's place (the only one it follows) without the
 * swap's rise, or it would arrive twice
 */
const SWAP_KEY: Readonly<Record<Stage, Stage>> = {
  live: 'live',
  result: 'live',
  stopped: 'stopped',
  undone: 'undone',
};

/** Which lead the run shows; Undo keeps the screen it was asked from */
function stageOf(run: RunState): Stage | null {
  if (run.phase === 'undone') {
    return 'undone';
  }
  if (run.phase === 'starting' || run.phase === 'running') {
    return 'live';
  }
  const fromStop = run.stopReason !== null;
  if (fromStop && (run.phase === 'stopped' || run.phase === 'undoing')) {
    return 'stopped';
  }
  if (!fromStop && (run.phase === 'done' || run.phase === 'undoing')) {
    return 'result';
  }
  return null;
}

/** The live counter, the result, the Stopped banner or "Import undone" */
function RunLead({
  importer,
  stage,
  state,
  username,
}: Readonly<{
  importer: Importer;
  stage: Stage;
  state: ImportState;
  username: string;
}>) {
  const { run, source } = state;
  switch (stage) {
    case 'live':
      return <RunLive run={run} />;
    case 'stopped':
      return <RunStopped importer={importer} run={run} />;
    case 'result':
      return (
        <RunResult
          importer={importer}
          run={run}
          source={source}
          username={username}
        />
      );
    case 'undone':
      return <UndoneCard onStartAgain={importer.anotherFile} />;
  }
}

/**
 * Step 3: the live counter, then the result (or the
 * Stopped banner, or "Import undone"), the problems to sort out and the
 * dates note. Each lead rises into the last one's place (the result has an
 * entrance of its own); the problems and the note stay put. Loaded when the import starts, not with the page.
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

  const undone = run.phase === 'undone';
  const stage = stageOf(run);
  const setUndoOpen = (open: boolean) => importer.askUndo(open);
  const confirmUndo = () => void importer.confirmUndo();
  const written = writtenCount(run);
  return (
    <>
      <UndoneStatus undone={undone} />
      {stage ? (
        // RunStopped is several blocks: the swap keeps the step's gap
        <SwapIn className="flex flex-col gap-6" swapKey={SWAP_KEY[stage]}>
          <RunLead
            importer={importer}
            stage={stage}
            state={state}
            username={username}
          />
        </SwapIn>
      ) : null}
      {undone ? null : (
        <>
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
      )}
    </>
  );
}
