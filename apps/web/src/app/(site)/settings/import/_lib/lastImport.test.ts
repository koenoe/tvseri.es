import type { LastImport } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import type { DetectedSource } from './columns';
import {
  type ImportAction,
  type ImportState,
  importReducer,
  initialImportState,
  type RunState,
} from './importState';
import {
  initialLastImport,
  type LastImportAction,
  lastAfterLeaving,
  lastImportReducer,
  runUndoable,
  type UndoableImport,
  undoableImport,
} from './lastImport';

const last = (extra: Partial<LastImport> = {}): LastImport => ({
  createdAt: 1_700_000_000_000,
  importId: 'imp-0',
  written: 1834,
  ...extra,
});

const netflix: DetectedSource = {
  kind: 'netflix',
  mapping: {
    date: 'Date',
    episode: 'Title',
    season: 'Title',
    service: { kind: 'fixed', name: 'Netflix' },
    show: 'Title',
  },
  recognised: true,
};

const progress = (written: number): ImportAction => ({
  event: {
    current: 'Dark',
    problems: [],
    shows: [],
    skipped: 0,
    status: 'progress',
    written,
  },
  type: 'importEvent',
});

const runAfter = (actions: ReadonlyArray<ImportAction>): RunState => {
  const state = [
    {
      file: { headers: ['Title', 'Date'], name: 'a.csv', rows: [] },
      prepared: {
        datedRows: 100,
        dateOrder: 'mdy',
        dateProblems: [],
        hasAssumedDates: false,
        importable: 100,
        rows: [],
        showCount: 1,
        skipped: { films: 0, repeats: 0 },
        tooLong: [],
        undatedRows: 0,
      },
      runId: 1,
      source: netflix,
      type: 'loaded',
    } satisfies ImportAction,
    { type: 'importStarting' } satisfies ImportAction,
    ...actions,
  ].reduce<ImportState>(importReducer, initialImportState);
  if (state.step !== 'import') {
    throw new Error('expected the import step');
  }
  return state.run;
};

const created: ImportAction = {
  createdAt: 1_700_000_100_000,
  importId: 'imp-1',
  type: 'importCreated',
};

const stoppedAt = (written: number, reason: 'failed' | 'conflict' = 'failed') =>
  runAfter([
    created,
    progress(written),
    { chunk: 0, type: 'chunkDone' },
    { chunk: 1, reason, type: 'importStopped' },
  ]);

describe('undoableImport', () => {
  it('offers a last import that wrote episodes and was never undone', () => {
    expect(undoableImport(last())).toEqual({
      createdAt: 1_700_000_000_000,
      importId: 'imp-0',
      written: 1834,
    });
  });

  it('offers nothing without one, once undone or asked to undo, or when it wrote nothing', () => {
    expect(undoableImport(undefined)).toBeNull();
    expect(undoableImport(null)).toBeNull();
    expect(undoableImport(last({ undoneAt: 2 }))).toBeNull();
    expect(undoableImport(last({ undoRequestedAt: 2 }))).toBeNull();
    expect(undoableImport(last({ written: 0 }))).toBeNull();
  });
});

describe('runUndoable', () => {
  it('offers a stopped import of this tab with what it wrote', () => {
    expect(runUndoable(stoppedAt(40))).toEqual({
      createdAt: 1_700_000_100_000,
      importId: 'imp-1',
      written: 40,
    });
  });

  it('offers nothing while it runs, when it wrote nothing, or when it was undone or replaced', () => {
    expect(runUndoable(runAfter([created, progress(40)]))).toBeNull();
    expect(runUndoable(stoppedAt(0))).toBeNull();
    expect(runUndoable(stoppedAt(40, 'conflict'))).toBeNull();
  });
});

describe('lastAfterLeaving', () => {
  const before: UndoableImport = {
    createdAt: 1,
    importId: 'imp-0',
    written: 5,
  };

  it('makes this tab’s import the last one once it is left', () => {
    const done = runAfter([created, progress(12), { type: 'importFinished' }]);
    expect(lastAfterLeaving(done, before)).toEqual({
      createdAt: 1_700_000_100_000,
      importId: 'imp-1',
      written: 12,
    });
  });

  it('keeps the earlier one when this tab never created an import', () => {
    const failed = runAfter([
      { chunk: 0, reason: 'failed', type: 'importStopped' },
    ]);
    expect(lastAfterLeaving(failed, before)).toBe(before);
  });

  it('offers nothing after an undone or empty import (the earlier one is no longer the last)', () => {
    const undone = runAfter([
      created,
      progress(12),
      { type: 'importFinished' },
      { type: 'undoRequested' },
      { type: 'undone' },
    ]);
    expect(lastAfterLeaving(undone, before)).toBeNull();
    const empty = runAfter([created, { type: 'importFinished' }]);
    expect(lastAfterLeaving(empty, before)).toBeNull();
  });
});

describe('lastImportReducer', () => {
  const reduce = (actions: ReadonlyArray<LastImportAction>) =>
    actions.reduce(
      lastImportReducer,
      initialLastImport(undoableImport(last())),
    );

  it('asks first, then undoes until the API says it is done', () => {
    expect(reduce([])).toMatchObject({ ask: false, phase: 'idle' });
    expect(reduce([{ open: true, type: 'ask' }]).ask).toBe(true);
    expect(
      reduce([{ open: true, type: 'ask' }, { type: 'undoRequested' }]),
    ).toMatchObject({ ask: false, phase: 'undoing' });
    expect(reduce([{ type: 'undoRequested' }, { type: 'undone' }]).phase).toBe(
      'undone',
    );
  });

  it('goes back to the row when Undo fails', () => {
    expect(
      reduce([{ type: 'undoRequested' }, { type: 'undoFailed' }]).phase,
    ).toBe('idle');
  });

  it('never asks without an import to undo', () => {
    const none = initialLastImport(null);
    expect(lastImportReducer(none, { open: true, type: 'ask' }).ask).toBe(
      false,
    );
    expect(lastImportReducer(none, { type: 'undoRequested' }).phase).toBe(
      'idle',
    );
  });

  it('takes a newer last import as a fresh row', () => {
    const next: UndoableImport = {
      createdAt: 3,
      importId: 'imp-2',
      written: 7,
    };
    expect(
      reduce([
        { type: 'undoRequested' },
        { type: 'undone' },
        { last: next, type: 'replaced' },
      ]),
    ).toEqual({ ask: false, last: next, phase: 'idle' });
  });
});
