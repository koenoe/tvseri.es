'use client';

import type { DetectedSource } from '../_lib/columns';
import {
  fixedExtra,
  importedCount,
  type RunState,
  showCount,
  topShows,
} from '../_lib/importState';
import { outcomeOf, rateOf } from '../_lib/outcome';
import type { Importer } from '../_lib/useImporter';
import OutcomeGlow from './OutcomeGlow';
import ResultCard from './ResultCard';

/** The result and the page glow in its outcome's tone. */
export default function RunResult({
  importer,
  run,
  source,
  username,
}: Readonly<{
  importer: Importer;
  run: RunState;
  source: DetectedSource;
  username: string;
}>) {
  const imported = importedCount(run);
  const rate = rateOf(imported, run.total);
  const outcome = outcomeOf(rate);
  const extra = fixedExtra(run);
  const shows = showCount(run);
  const top = topShows(run);
  const topTitle =
    source.kind === 'netflix' ? 'The series it brought in' : 'What came in';
  const askUndo = () => importer.askUndo(true);
  const undoing = run.phase === 'undoing';
  return (
    <>
      <OutcomeGlow outcome={outcome} />
      <ResultCard
        extra={extra}
        importable={run.total}
        imported={imported}
        onLeave={importer.flushFixes}
        onUndo={askUndo}
        outcome={outcome}
        rate={rate}
        showCount={shows}
        shows={top}
        topTitle={topTitle}
        undoing={undoing}
        username={username}
      />
    </>
  );
}
