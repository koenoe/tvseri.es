'use client';

import { plural } from '@tvseri.es/utils';
import { useMemo } from 'react';

import type { ImportProvider } from '../_data/importer';
import { isCombinedColumn } from '../_lib/columns';
import { datesLine, readOrder, recognisedLine } from '../_lib/copy';
import {
  type CheckStep as CheckState,
  checkSummary,
  missingField,
} from '../_lib/importState';
import { dateExampleOf, previewHeads, previewRows } from '../_lib/previewTable';
import { unmatchedLines } from '../_lib/problems';
import type { Importer } from '../_lib/useImporter';
import CheckBanner from './CheckBanner';
import CheckFooter from './CheckFooter';
import CheckSummary from './CheckSummary';
import ColumnsPanel from './ColumnsPanel';
import DatesNote from './DatesNote';
import PreviewTable from './PreviewTable';

const notCountedLine = (state: CheckState): string => {
  const { films, repeats } = state.prepared.skipped;
  const unreadable = state.prepared.dateProblems.length;
  const tooLong = state.prepared.tooLong.length;
  const parts = [
    films > 0 ? plural(films, 'film or special', 'films and specials') : '',
    repeats > 0
      ? `${plural(repeats, 'repeat')}${state.source.kind === 'netflix' ? ' (the same episode on another day counts once, on the latest day)' : ''}`
      : '',
    unreadable > 0
      ? `${plural(unreadable, 'row')} with dates we couldn’t read`
      : '',
    tooLong > 0 ? `${plural(tooLong, 'row')} with text too long to import` : '',
  ].filter(Boolean);
  if (parts.length === 0) {
    return '';
  }
  const last = parts.pop();
  return `Not counted: ${parts.length > 0 ? `${parts.join(', ')}, and ${last}` : last}.`;
};

/**
 * Step 2: what we recognised, the columns (on request),
 * the first rows as they will be read, one summary line from the dry run,
 * how the dates were read, and the button. Nothing is written here.
 */
export default function CheckStep({
  importer,
  posters,
  providers,
  state,
}: Readonly<{
  importer: Importer;
  /** Preview thumbs by show title */
  posters: Readonly<Record<string, string>>;
  providers: ReadonlyArray<ImportProvider>;
  state: CheckState;
}>) {
  const { file, mapping, prepared, source } = state;
  const providerNames = useMemo(
    () => providers.map((p) => p.name),
    [providers],
  );
  const rows = useMemo(
    () =>
      previewRows(file.rows, mapping, prepared.dateOrder, providers, posters),
    [file.rows, mapping, prepared.dateOrder, providers, posters],
  );
  const heads = useMemo(() => previewHeads(mapping), [mapping]);
  const example = useMemo(
    () => dateExampleOf(file.rows, mapping, prepared.dateOrder),
    [file.rows, mapping, prepared.dateOrder],
  );
  const combined = useMemo(
    () => ({
      episode: isCombinedColumn(file.rows, mapping.episode),
      season: isCombinedColumn(file.rows, mapping.season),
      show: isCombinedColumn(file.rows, mapping.show),
    }),
    [file.rows, mapping],
  );
  const lines = useMemo(
    () => unmatchedLines(state.check.problems),
    [state.check.problems],
  );

  const summary = checkSummary(state);
  const missing = missingField(mapping);
  const checking =
    state.check.status === 'running'
      ? { done: state.check.checkedRows, of: prepared.importable }
      : null;
  const order = readOrder(prepared.dateOrder, example?.raw ?? null);
  const exampleText = example ? `${example.raw} is ${example.read}` : '';
  const dates = datesLine(source, mapping, prepared.dateOrder, example);

  return (
    <>
      <CheckBanner
        edit={state.edit}
        line={recognisedLine(source)}
        name={file.name}
        onToggle={importer.toggleEdit}
      />
      {state.edit ? (
        <ColumnsPanel
          combined={combined}
          dateExample={exampleText}
          dateOrder={order}
          headers={file.headers}
          mapping={mapping}
          onMapping={importer.setMapping}
          providers={providerNames}
          source={source}
        />
      ) : null}
      <PreviewTable heads={heads} rows={rows} />
      <CheckSummary
        checking={checking}
        episodes={summary.episodes}
        failed={state.check.status === 'failed'}
        lines={lines}
        notCounted={notCountedLine(state)}
        onToggle={importer.toggleUnmatched}
        open={state.showUnmatched}
        rows={summary.rows}
        unmatched={summary.unmatched}
      />
      <DatesNote isNew>{dates}</DatesNote>
      <CheckFooter
        episodes={summary.episodes}
        missing={missing}
        onAnotherFile={importer.anotherFile}
        onImport={importer.beginImport}
      />
    </>
  );
}
