import { describe, expect, it } from 'vitest';
import type {
  ImportEvent,
  ImportedShow,
  ImportProblem,
} from '@/lib/import/contract';
import type { ColumnMapping, DetectedSource } from './columns';
import {
  answeredRows,
  checkSummary,
  fixedExtra,
  groupsOf,
  type ImportAction,
  type ImportState,
  importedCount,
  importReducer,
  initialImportState,
  liveRate,
  missingField,
  progressOf,
  showCount,
  topShows,
} from './importState';
import type { PreparedImport } from './prepareRows';

const NETFLIX: ColumnMapping = {
  date: 'Date',
  episode: 'Title',
  season: 'Title',
  service: { kind: 'fixed', name: 'Netflix' },
  show: 'Title',
};

const netflix: DetectedSource = {
  kind: 'netflix',
  mapping: NETFLIX,
  recognised: true,
};

const unknownCsv: DetectedSource = {
  kind: 'csv',
  mapping: {
    date: '',
    episode: '',
    season: '',
    service: { kind: 'none' },
    show: 'Series',
  },
  recognised: false,
};

const prepared = (importable: number): PreparedImport => ({
  datedRows: importable,
  dateOrder: 'mdy',
  dateProblems: [],
  hasAssumedDates: true,
  importable,
  rows: [],
  showCount: 3,
  skipped: { films: 412, repeats: 265 },
  tooLong: [],
  undatedRows: 0,
});

const file = {
  headers: ['Title', 'Date'],
  name: 'NetflixViewingHistory.csv',
  rows: Array.from({ length: 2554 }, () => ({
    Date: '11/6/26',
    Title: 'Dark: Season 1: Secrets',
  })),
};

const run = (
  actions: ReadonlyArray<ImportAction>,
  from: ImportState = initialImportState,
) => actions.reduce(importReducer, from);

const loaded: ImportAction = {
  file,
  prepared: prepared(1877),
  runId: 1,
  source: netflix,
  type: 'loaded',
};

const show = (id: number, title: string, count: number): ImportedShow => ({
  count,
  id,
  posterImage: null,
  slug: title.toLowerCase(),
  title,
});

const ambiguous = (index: number, title = 'Top Boy'): ImportProblem => ({
  candidates: [],
  index,
  kind: 'ambiguous',
  row: { episode: 'Episode 1', season: 'Season 1', title },
});

const progress = (
  written: number,
  extra: Partial<Exclude<ImportEvent, { status: 'error' }>> = {},
): ImportAction => ({
  event: {
    current: 'Dark',
    problems: [],
    shows: [],
    skipped: 0,
    status: 'progress',
    written,
    ...extra,
  },
  type: 'importEvent',
});

const started: ReadonlyArray<ImportAction> = [
  loaded,
  { type: 'importStarting' },
  { createdAt: 1_700_000_000_000, importId: 'imp-1', type: 'importCreated' },
];

const runOf = (state: ImportState) => {
  if (state.step !== 'import') {
    throw new Error(`expected the import step, got ${state.step}`);
  }
  return state.run;
};

describe('step 1 · upload', () => {
  it('goes straight to Check when a file is dropped, the columns closed for a recognised file', () => {
    const state = run([loaded]);
    expect(state.step).toBe('check');
    if (state.step !== 'check') return;
    expect(state.edit).toBe(false);
    expect(state.mapping).toBe(NETFLIX);
    expect(state.check).toMatchObject({ runId: 1, status: 'running' });
  });

  it('opens Edit columns by itself when the file is not recognised', () => {
    const state = run([{ ...loaded, source: unknownCsv }]);
    expect(state.step === 'check' && state.edit).toBe(true);
  });
});

describe('step 2 · check', () => {
  it('fills the summary in as the dry run answers', () => {
    const state = run([
      loaded,
      {
        event: {
          alreadyWatched: 4,
          matched: 48,
          problems: [ambiguous(3), ambiguous(9)],
          seriesIds: [1],
          status: 'checked',
        },
        rows: 50,
        runId: 1,
        type: 'checkEvent',
      },
      { ok: true, runId: 1, type: 'checkEnded' },
    ]);
    if (state.step !== 'check') throw new Error('check');
    expect(state.check).toMatchObject({
      alreadyWatched: 4,
      checkedRows: 50,
      matched: 48,
      status: 'done',
    });
    expect(checkSummary(state)).toEqual({
      episodes: 1875,
      rows: 2554,
      unmatched: 2,
    });
  });

  it('ignores answers from a dry run of an earlier mapping', () => {
    const remapped = run([
      loaded,
      {
        mapping: { ...NETFLIX, season: '' },
        prepared: prepared(1900),
        runId: 2,
        type: 'mapping',
      },
      {
        event: {
          alreadyWatched: 0,
          matched: 50,
          problems: [],
          seriesIds: [],
          status: 'checked',
        },
        rows: 50,
        runId: 1,
        type: 'checkEvent',
      },
      { ok: true, runId: 1, type: 'checkEnded' },
    ]);
    if (remapped.step !== 'check') throw new Error('check');
    expect(remapped.check).toMatchObject({
      checkedRows: 0,
      runId: 2,
      status: 'running',
    });
    expect(remapped.prepared.importable).toBe(1900);
  });

  it('marks a failed dry run', () => {
    const state = run([loaded, { ok: false, runId: 1, type: 'checkEnded' }]);
    expect(state.step === 'check' && state.check.status).toBe('failed');
  });

  it('names the field that needs a column before Import is allowed', () => {
    expect(missingField(NETFLIX)).toBeNull();
    expect(missingField({ ...NETFLIX, show: '' })).toBe('Series');
    expect(missingField({ ...NETFLIX, episode: '' })).toBe('Episode');
  });

  it('goes back to Upload with Another file, keeping the help tab', () => {
    expect(
      run([{ tab: 'csv', type: 'tab' }, loaded, { type: 'anotherFile' }]),
    ).toEqual({
      step: 'upload',
      tab: 'csv',
    });
  });
});

describe('step 3 · import', () => {
  it('starts, then runs once the import exists', () => {
    const starting = run([loaded, { type: 'importStarting' }]);
    expect(runOf(starting)).toMatchObject({
      importId: null,
      phase: 'starting',
      total: 1877,
    });
    expect(runOf(run(started))).toMatchObject({
      importId: 'imp-1',
      phase: 'running',
    });
  });

  it('counts written and already-watched episodes as they stream, with the show being imported', () => {
    const state = run([
      ...started,
      progress(20, { current: 'Stranger Things', skipped: 5 }),
      progress(20, { problems: [ambiguous(40)] }),
    ]);
    const r = runOf(state);
    expect(importedCount(r)).toBe(45);
    expect(answeredRows(r)).toBe(46);
    expect(liveRate(r)).toBeCloseTo(45 / 46);
    expect(progressOf(r)).toBeCloseTo(46 / 1877);
    expect(r.current).toBe('Dark');
  });

  it('creates the import on Continue when creating it failed the first time', () => {
    const failed = run([
      loaded,
      { type: 'importStarting' },
      { chunk: 0, reason: 'failed', type: 'importStopped' },
      { type: 'importResumed' },
      {
        createdAt: 1_700_000_000_000,
        importId: 'imp-2',
        type: 'importCreated',
      },
    ]);
    expect(runOf(failed)).toMatchObject({
      importId: 'imp-2',
      phase: 'running',
      resumeChunk: 0,
    });
  });

  it('keeps finished chunks and drops the stopped one, then resumes from it', () => {
    const stopped = run([
      ...started,
      progress(50),
      { chunk: 0, type: 'chunkDone' },
      progress(25),
      { chunk: 1, reason: 'unauthenticated', type: 'importStopped' },
    ]);
    const r = runOf(stopped);
    expect(r).toMatchObject({
      phase: 'stopped',
      resumeChunk: 1,
      stopReason: 'unauthenticated',
    });
    expect(importedCount(r)).toBe(50);

    const resumed = runOf(run([{ type: 'importResumed' }], stopped));
    expect(resumed).toMatchObject({
      phase: 'running',
      resumeChunk: 1,
      stopReason: null,
    });
  });

  it('finishes with the shows it brought in, most episodes first', () => {
    const state = run([
      ...started,
      progress(30, { shows: [show(1, 'Dark', 10), show(2, 'Travelers', 20)] }),
      { chunk: 0, type: 'chunkDone' },
      progress(12, { shows: [show(1, 'Dark', 12)] }),
      { type: 'importFinished' },
    ]);
    const r = runOf(state);
    expect(r.phase).toBe('done');
    expect(r.current).toBeNull();
    expect(importedCount(r)).toBe(42);
    expect(topShows(r).map((s) => [s.title, s.count])).toEqual([
      ['Dark', 22],
      ['Travelers', 20],
    ]);
    expect(showCount(r)).toBe(2);
  });

  it('opens “Which series?” first and toggles the groups', () => {
    const r = runOf(
      run([...started, { group: 'notFound', type: 'toggleGroup' }]),
    );
    expect(r.open).toEqual({
      ambiguous: true,
      noEpisode: false,
      notFound: true,
    });
  });
});

describe('fixes', () => {
  const withProblems = run([
    ...started,
    progress(10, { problems: [ambiguous(1), ambiguous(2)] }),
    { type: 'importFinished' },
  ]);

  it('counts a picked show only once the route says what came in', () => {
    const picked = run(
      [
        {
          fix: {
            imported: 2,
            kind: 'picked',
            label: 'Top Boy (2019)',
            rows: 2,
            status: 'waiting',
          },
          key: 'amb:top boy',
          type: 'fix',
        },
      ],
      withProblems,
    );
    expect(fixedExtra(runOf(picked))).toBe(0);
    expect(importedCount(runOf(picked))).toBe(10);
    const sending = run([{ key: 'amb:top boy', type: 'fixSending' }], picked);
    expect(importedCount(runOf(sending))).toBe(10);

    const sent = run(
      [
        {
          key: 'amb:top boy',
          problems: [],
          skipped: 0,
          type: 'fixResult',
          written: 1,
        },
      ],
      sending,
    );
    expect(runOf(sent).fixes['amb:top boy']).toMatchObject({
      imported: 1,
      status: 'sent',
    });
    expect(importedCount(runOf(sent))).toBe(11);
  });

  it('undoes a fix that has not been sent', () => {
    const undone = run(
      [
        { fix: { kind: 'skipped', rows: 2 }, key: 'amb:top boy', type: 'fix' },
        { fix: null, key: 'amb:top boy', type: 'fix' },
      ],
      withProblems,
    );
    expect(runOf(undone).fixes).toEqual({});
  });

  it('adds what a fix came back with as new items', () => {
    const followUp: ImportProblem = {
      index: 1,
      kind: 'episode-not-found',
      row: { episode: 'Episode 9', season: 'Season 1', title: 'Top Boy' },
    };
    const state = run(
      [
        {
          fix: {
            imported: 2,
            kind: 'picked',
            label: 'Top Boy (2019)',
            rows: 2,
            status: 'sending',
          },
          key: 'amb:top boy',
          type: 'fix',
        },
        {
          key: 'amb:top boy',
          problems: [followUp],
          skipped: 0,
          type: 'fixResult',
          written: 1,
        },
      ],
      withProblems,
    );
    const groups = groupsOf(runOf(state));
    expect(groups.ambiguous.map((item) => item.key)).toEqual(['amb:top boy']);
    expect(groups.notFound.map((item) => item.key)).toEqual(['en:1#1']);
  });

  it('counts nothing for a fix that failed to send', () => {
    const state = run(
      [
        {
          fix: {
            imported: 2,
            kind: 'picked',
            label: 'Top Boy (2019)',
            rows: 2,
            status: 'sending',
          },
          key: 'amb:top boy',
          type: 'fix',
        },
        { key: 'amb:top boy', type: 'fixFailed' },
      ],
      withProblems,
    );
    expect(runOf(state).fixes['amb:top boy']).toMatchObject({
      imported: 0,
      status: 'failed',
    });
  });
});

describe('undo', () => {
  const done = run([...started, progress(10), { type: 'importFinished' }]);

  it('asks first, then undoes until the API says it is done', () => {
    const asked = run([{ open: true, type: 'askUndo' }], done);
    expect(runOf(asked).undoAsk).toBe(true);
    const undoing = run([{ type: 'undoRequested' }], asked);
    expect(runOf(undoing)).toMatchObject({ phase: 'undoing', undoAsk: false });
    expect(runOf(run([{ type: 'undone' }], undoing)).phase).toBe('undone');
  });

  it('keeps the result when Undo fails', () => {
    expect(
      runOf(run([{ type: 'undoRequested' }, { type: 'undoFailed' }], done))
        .phase,
    ).toBe('done');
  });

  it('closes the dialog with Keep it', () => {
    const kept = run(
      [
        { open: true, type: 'askUndo' },
        { open: false, type: 'askUndo' },
      ],
      done,
    );
    expect(runOf(kept)).toMatchObject({ phase: 'done', undoAsk: false });
  });

  it('undoes a stopped import from its banner, and goes back to it if Undo fails', () => {
    const stopped = run([
      ...started,
      progress(10),
      { chunk: 0, type: 'chunkDone' },
      { chunk: 1, reason: 'failed', type: 'importStopped' },
    ]);
    const asked = run([{ open: true, type: 'askUndo' }], stopped);
    expect(runOf(asked).undoAsk).toBe(true);
    const undoing = run([{ type: 'undoRequested' }], asked);
    expect(runOf(undoing)).toMatchObject({
      phase: 'undoing',
      stopReason: 'failed',
      undoAsk: false,
    });
    expect(runOf(run([{ type: 'undoFailed' }], undoing)).phase).toBe('stopped');
    expect(runOf(run([{ type: 'undone' }], undoing)).phase).toBe('undone');
  });

  it('starts again from Upload after an undo', () => {
    const undone = run(
      [{ type: 'undoRequested' }, { type: 'undone' }, { type: 'anotherFile' }],
      done,
    );
    expect(undone.step).toBe('upload');
  });
});
