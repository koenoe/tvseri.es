import type {
  CheckEvent,
  ImportEvent,
  ImportedShow,
  ImportProblem,
} from '@/lib/import/contract';
import type { Fix } from '../../_components/problems/fix';
import {
  type ProblemGroups,
  problemGroups,
} from '../../_components/problems/problems';
import type { ColumnMapping, DetectedSource } from './columns';
import type { PreparedImport } from './prepareRows';
import type { StopReason } from './runChunks';

/**
 * The importer as one pure state machine (the three steps and every
 * state of the importer). Side effects (reading the file, the dry run, the
 * chunked import, Undo) live in the hooks; they report back through these
 * actions, so every transition is testable without a browser.
 */

export type HelpTab = 'netflix' | 'prime' | 'csv';

export type ParsedFile = Readonly<{
  name: string;
  headers: ReadonlyArray<string>;
  rows: ReadonlyArray<Record<string, unknown>>;
}>;

export type CheckState = Readonly<{
  /** Which dry run these numbers belong to (a newer mapping restarts it) */
  runId: number;
  status: 'running' | 'done' | 'failed';
  /** Rows the dry run has answered for */
  checkedRows: number;
  matched: number;
  alreadyWatched: number;
  problems: ReadonlyArray<ImportProblem>;
}>;

export type Tally = Readonly<{
  written: number;
  skipped: number;
  problems: ReadonlyArray<ImportProblem>;
  shows: ReadonlyArray<ImportedShow>;
}>;

export type GroupId = 'ambiguous' | 'notFound' | 'noEpisode';

export type RunPhase =
  | 'starting'
  | 'running'
  | 'stopped'
  | 'done'
  | 'undoing'
  | 'undone';

export type RunState = Readonly<{
  importId: string | null;
  /** When the API created the import (epoch ms; the Undo row's "when") */
  createdAt: number | null;
  phase: RunPhase;
  stopReason: StopReason | null;
  /** The chunk Continue resumes from */
  resumeChunk: number;
  /** Importable rows: "items imported out of 1,877" */
  total: number;
  /** Finished chunks */
  committed: Tally;
  /** The chunk on the wire: dropped if it stops (it is sent again) */
  inflight: Tally;
  current: string | null;
  fixes: Readonly<Record<string, Fix>>;
  /** Problems a fix came back with ("Two shows" → that episode isn't there) */
  followUps: ReadonlyArray<ReadonlyArray<ImportProblem>>;
  open: Readonly<Record<GroupId, boolean>>;
  undoAsk: boolean;
}>;

type Loaded = Readonly<{
  tab: HelpTab;
  file: ParsedFile;
  source: DetectedSource;
  mapping: ColumnMapping;
  prepared: PreparedImport;
}>;

export type ImportState =
  | Readonly<{ step: 'upload'; tab: HelpTab }>
  | (Loaded &
      Readonly<{
        step: 'check';
        edit: boolean;
        showUnmatched: boolean;
        check: CheckState;
      }>)
  | (Loaded & Readonly<{ step: 'import'; run: RunState }>);

export type CheckStep = Extract<ImportState, { step: 'check' }>;
export type ImportStep = Extract<ImportState, { step: 'import' }>;

type CheckSuccess = Exclude<CheckEvent, { status: 'error' }>;
type ImportSuccess = Exclude<ImportEvent, { status: 'error' }>;

export type ImportAction =
  | Readonly<{ type: 'tab'; tab: HelpTab }>
  | Readonly<{
      type: 'loaded';
      file: ParsedFile;
      source: DetectedSource;
      prepared: PreparedImport;
      runId: number;
    }>
  | Readonly<{
      type: 'mapping';
      mapping: ColumnMapping;
      prepared: PreparedImport;
      runId: number;
    }>
  | Readonly<{ type: 'toggleEdit' }>
  | Readonly<{ type: 'toggleUnmatched' }>
  | Readonly<{
      type: 'checkEvent';
      runId: number;
      event: CheckSuccess;
      rows: number;
    }>
  | Readonly<{ type: 'checkEnded'; runId: number; ok: boolean }>
  | Readonly<{ type: 'anotherFile' }>
  | Readonly<{ type: 'importStarting' }>
  | Readonly<{ type: 'importCreated'; importId: string; createdAt: number }>
  | Readonly<{ type: 'importEvent'; event: ImportSuccess }>
  | Readonly<{ type: 'chunkDone'; chunk: number }>
  | Readonly<{ type: 'importStopped'; reason: StopReason; chunk: number }>
  | Readonly<{ type: 'importResumed' }>
  | Readonly<{ type: 'importFinished' }>
  | Readonly<{ type: 'toggleGroup'; group: GroupId }>
  | Readonly<{ type: 'fix'; key: string; fix: Fix | null }>
  | Readonly<{ type: 'fixSending'; key: string }>
  | Readonly<{
      type: 'fixResult';
      key: string;
      written: number;
      skipped: number;
      problems: ReadonlyArray<ImportProblem>;
      /** The shows it brought in (they join the top 8 and the show count) */
      shows?: ReadonlyArray<ImportedShow>;
    }>
  | Readonly<{ type: 'fixFailed'; key: string }>
  | Readonly<{ type: 'askUndo'; open: boolean }>
  | Readonly<{ type: 'undoRequested' }>
  | Readonly<{ type: 'undoFailed' }>
  | Readonly<{ type: 'undone' }>;

export const initialImportState: ImportState = {
  step: 'upload',
  tab: 'netflix',
};

const EMPTY_TALLY: Tally = { problems: [], shows: [], skipped: 0, written: 0 };

const newCheck = (runId: number): CheckState => ({
  alreadyWatched: 0,
  checkedRows: 0,
  matched: 0,
  problems: [],
  runId,
  status: 'running',
});

/** Shows by id, counts added up (a show arrives in many batches). */
const mergeShows = (
  into: ReadonlyArray<ImportedShow>,
  shows: ReadonlyArray<ImportedShow>,
): ReadonlyArray<ImportedShow> => {
  if (shows.length === 0) {
    return into;
  }
  const byId = new Map(into.map((show) => [show.id, show]));
  for (const show of shows) {
    const known = byId.get(show.id);
    byId.set(
      show.id,
      known ? { ...known, count: known.count + show.count } : show,
    );
  }
  return [...byId.values()];
};

const addEvent = (tally: Tally, event: ImportSuccess): Tally => ({
  problems:
    event.problems.length > 0
      ? [...tally.problems, ...event.problems]
      : tally.problems,
  shows: mergeShows(tally.shows, event.shows),
  skipped: tally.skipped + event.skipped,
  written: tally.written + event.written,
});

const mergeTally = (a: Tally, b: Tally): Tally => ({
  problems: b.problems.length > 0 ? [...a.problems, ...b.problems] : a.problems,
  shows: mergeShows(a.shows, b.shows),
  skipped: a.skipped + b.skipped,
  written: a.written + b.written,
});

const withRun = (
  state: ImportState,
  update: (run: RunState) => RunState | null,
): ImportState => {
  if (state.step !== 'import') {
    return state;
  }
  const run = update(state.run);
  return run ? { ...state, run } : state;
};

const loadedOf = (state: ImportState): Loaded | null =>
  state.step === 'upload'
    ? null
    : {
        file: state.file,
        mapping: state.mapping,
        prepared: state.prepared,
        source: state.source,
        tab: state.tab,
      };

export function importReducer(
  state: ImportState,
  action: ImportAction,
): ImportState {
  switch (action.type) {
    case 'tab':
      return state.step === 'upload' ? { ...state, tab: action.tab } : state;

    case 'loaded':
      return {
        check: newCheck(action.runId),
        // Not recognised (Prime's file drifts, any CSV): the columns open by themselves
        edit: !action.source.recognised,
        file: action.file,
        mapping: action.source.mapping,
        prepared: action.prepared,
        showUnmatched: false,
        source: action.source,
        step: 'check',
        tab: state.tab,
      };

    case 'mapping':
      return state.step === 'check'
        ? {
            ...state,
            check: newCheck(action.runId),
            mapping: action.mapping,
            prepared: action.prepared,
          }
        : state;

    case 'toggleEdit':
      return state.step === 'check' ? { ...state, edit: !state.edit } : state;

    case 'toggleUnmatched':
      return state.step === 'check'
        ? { ...state, showUnmatched: !state.showUnmatched }
        : state;

    case 'checkEvent': {
      if (state.step !== 'check' || state.check.runId !== action.runId) {
        return state;
      }
      const { check } = state;
      const { event } = action;
      return {
        ...state,
        check: {
          ...check,
          alreadyWatched: check.alreadyWatched + event.alreadyWatched,
          checkedRows: check.checkedRows + action.rows,
          matched: check.matched + event.matched,
          problems:
            event.problems.length > 0
              ? [...check.problems, ...event.problems]
              : check.problems,
        },
      };
    }

    case 'checkEnded':
      return state.step === 'check' && state.check.runId === action.runId
        ? {
            ...state,
            check: { ...state.check, status: action.ok ? 'done' : 'failed' },
          }
        : state;

    case 'anotherFile':
      return { step: 'upload', tab: state.tab };

    case 'importStarting': {
      const loaded = loadedOf(state);
      if (state.step !== 'check' || !loaded) {
        return state;
      }
      return {
        ...loaded,
        run: {
          committed: EMPTY_TALLY,
          createdAt: null,
          current: null,
          fixes: {},
          followUps: [],
          importId: null,
          inflight: EMPTY_TALLY,
          open: { ambiguous: true, noEpisode: false, notFound: false },
          phase: 'starting',
          resumeChunk: 0,
          stopReason: null,
          total: loaded.prepared.importable,
          undoAsk: false,
        },
        step: 'import',
      };
    }

    case 'importCreated':
      return withRun(state, (run) =>
        run.phase === 'starting' || (run.phase === 'running' && !run.importId)
          ? {
              ...run,
              createdAt: action.createdAt,
              importId: action.importId,
              phase: 'running',
            }
          : null,
      );

    case 'importEvent':
      return withRun(state, (run) =>
        run.phase === 'running'
          ? {
              ...run,
              current: action.event.current ?? run.current,
              inflight: addEvent(run.inflight, action.event),
            }
          : null,
      );

    case 'chunkDone':
      return withRun(state, (run) => ({
        ...run,
        committed: mergeTally(run.committed, run.inflight),
        inflight: EMPTY_TALLY,
        resumeChunk: action.chunk + 1,
      }));

    case 'importStopped':
      return withRun(state, (run) => ({
        ...run,
        // What the stopped chunk wrote comes back as "already watched" on Continue
        inflight: EMPTY_TALLY,
        phase: 'stopped',
        resumeChunk: action.chunk,
        stopReason: action.reason,
      }));

    case 'importResumed':
      return withRun(state, (run) =>
        run.phase === 'stopped'
          ? { ...run, phase: 'running', stopReason: null }
          : null,
      );

    case 'importFinished':
      return withRun(state, (run) =>
        run.phase === 'running'
          ? {
              ...run,
              committed: mergeTally(run.committed, run.inflight),
              current: null,
              inflight: EMPTY_TALLY,
              phase: 'done',
            }
          : null,
      );

    case 'toggleGroup':
      return withRun(state, (run) => ({
        ...run,
        open: { ...run.open, [action.group]: !run.open[action.group] },
      }));

    case 'fix':
      return withRun(state, (run) => {
        const fixes = { ...run.fixes };
        if (action.fix) {
          fixes[action.key] = action.fix;
        } else {
          delete fixes[action.key];
        }
        return { ...run, fixes };
      });

    case 'fixSending':
      return withRun(state, (run) => {
        const fix = run.fixes[action.key];
        return fix?.kind === 'picked'
          ? {
              ...run,
              fixes: {
                ...run.fixes,
                [action.key]: { ...fix, status: 'sending' },
              },
            }
          : null;
      });

    case 'fixResult':
      return withRun(state, (run) => {
        const fix = run.fixes[action.key];
        if (fix?.kind !== 'picked') {
          return null;
        }
        return {
          ...run,
          committed: {
            ...run.committed,
            shows: mergeShows(run.committed.shows, action.shows ?? []),
          },
          fixes: {
            ...run.fixes,
            [action.key]: {
              ...fix,
              imported: action.written + action.skipped,
              status: 'sent',
            },
          },
          followUps:
            action.problems.length > 0
              ? [...run.followUps, action.problems]
              : run.followUps,
        };
      });

    case 'fixFailed':
      return withRun(state, (run) => {
        const fix = run.fixes[action.key];
        return fix?.kind === 'picked'
          ? {
              ...run,
              fixes: {
                ...run.fixes,
                [action.key]: { ...fix, imported: 0, status: 'failed' },
              },
            }
          : null;
      });

    // From the result, or from the Stopped banner (its reason stays set)
    case 'askUndo':
      return withRun(state, (run) =>
        run.phase === 'done' || run.phase === 'stopped'
          ? { ...run, undoAsk: action.open }
          : null,
      );

    case 'undoRequested':
      return withRun(state, (run) =>
        run.phase === 'done' || run.phase === 'stopped'
          ? { ...run, phase: 'undoing', undoAsk: false }
          : null,
      );

    case 'undoFailed':
      return withRun(state, (run) =>
        run.phase === 'undoing'
          ? { ...run, phase: run.stopReason ? 'stopped' : 'done' }
          : null,
      );

    case 'undone':
      return withRun(state, (run) =>
        run.phase === 'undoing' ? { ...run, phase: 'undone' } : null,
      );
  }
}

/** What the Check step's summary line says. */
export const checkSummary = (state: CheckStep) => {
  const unmatched = state.check.problems.length;
  return {
    /** "1,834 episodes" (fills in while the dry run answers) */
    episodes: Math.max(0, state.prepared.importable - unmatched),
    rows: state.file.rows.length,
    unmatched,
  };
};

/** Series and Episode need a column; the button says which is missing. */
export const missingField = (
  mapping: ColumnMapping,
): 'Series' | 'Episode' | null =>
  !mapping.show ? 'Series' : !mapping.episode ? 'Episode' : null;

/** What fixes brought in: only writes the route has answered for. */
export const fixedExtra = (run: RunState): number =>
  Object.values(run.fixes).reduce(
    (sum, fix) =>
      fix.kind === 'picked' && fix.status === 'sent' ? sum + fix.imported : sum,
    0,
  );

const tallyOf = (run: RunState): Tally =>
  mergeTally(run.committed, run.inflight);

/** Episodes in the history now (new + already there) plus what fixes brought in. */
export const importedCount = (run: RunState): number => {
  const tally = tallyOf(run);
  return tally.written + tally.skipped + fixedExtra(run);
};

/** Rows the route has answered for (imported or a problem). */
export const answeredRows = (run: RunState): number => {
  const tally = tallyOf(run);
  return tally.written + tally.skipped + tally.problems.length;
};

/** "98% matched so far": of the rows answered, how many came in. */
export const liveRate = (run: RunState): number => {
  const answered = answeredRows(run);
  return answered > 0 ? importedCount(run) / answered : 1;
};

/** The 4px line: answered ÷ importable. */
export const progressOf = (run: RunState): number =>
  run.total > 0 ? Math.min(1, answeredRows(run) / run.total) : 1;

/** "The shows it brought in": most episodes first, ties by title. */
export const topShows = (
  run: RunState,
  count = 8,
): ReadonlyArray<ImportedShow> =>
  tallyOf(run)
    .shows.slice()
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, count);

export const showCount = (run: RunState): number => tallyOf(run).shows.length;

/** The import's groups, follow-ups (from fixes) after the first problems. */
export const groupsOf = (run: RunState): ProblemGroups => {
  const rounds = [problemGroups(tallyOf(run).problems)].concat(
    run.followUps.map((problems, index) => problemGroups(problems, index + 1)),
  );
  return {
    ambiguous: rounds.flatMap((round) => round.ambiguous),
    notFound: rounds.flatMap((round) => round.notFound),
  };
};

/** Episodes this import added (Undo removes these; earlier marks stay). */
export const writtenCount = (run: RunState): number =>
  tallyOf(run).written + fixedExtra(run);
