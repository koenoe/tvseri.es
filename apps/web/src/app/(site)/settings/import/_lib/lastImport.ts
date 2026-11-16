import type { LastImport } from '@tvseri.es/schemas';

import { type RunState, writtenCount } from './importState';

/**
 * "Your last import" with Undo, for an import that isn't on screen as a
 * result: one that stopped, was left, or ran before a reload. The API only
 * undoes the viewer's last import, so there is at most one.
 */
export type UndoableImport = Readonly<{
  importId: string;
  /** epoch ms */
  createdAt: number;
  /** Episodes it added (what Undo removes) */
  written: number;
}>;

/**
 * Episodes from the import that are in the history now: the ones it added
 * plus the ones that were there already. The result card and the sidebar
 * line both show this number.
 */
export const importedEpisodes = (last: LastImport): number =>
  last.written + (last.skipped ?? 0);

/** `GET /me`'s `lastImport`, when it can still be undone. */
export const undoableImport = (
  last: LastImport | null | undefined,
): UndoableImport | null =>
  last && !last.undoneAt && !last.undoRequestedAt && last.written > 0
    ? {
        createdAt: last.createdAt,
        importId: last.importId,
        written: last.written,
      }
    : null;

const fromRun = (run: RunState): UndoableImport | null => {
  const written = writtenCount(run);
  return run.importId && run.createdAt !== null && written > 0
    ? { createdAt: run.createdAt, importId: run.importId, written }
    : null;
};

/**
 * This tab's import on the Stopped banner: undoable once it stopped (or
 * while that Undo runs), unless it stopped because it was undone or
 * replaced already.
 */
export const runUndoable = (run: RunState): UndoableImport | null =>
  run.stopReason !== null && run.stopReason !== 'conflict'
    ? fromRun(run)
    : null;

/**
 * The last import once this tab's run is left ("Import another file"): the
 * run, when it created one (an undone or empty one leaves nothing to undo,
 * and the earlier import is no longer the last); else the one before.
 */
export const lastAfterLeaving = (
  run: RunState,
  before: UndoableImport | null,
): UndoableImport | null => {
  if (!run.importId) {
    return before;
  }
  return run.phase === 'undoing' || run.phase === 'undone'
    ? null
    : fromRun(run);
};

export type LastImportState = Readonly<{
  last: UndoableImport | null;
  /** The confirm dialog is open */
  ask: boolean;
  phase: 'idle' | 'undoing' | 'undone';
}>;

export type LastImportAction =
  | Readonly<{ type: 'replaced'; last: UndoableImport | null }>
  | Readonly<{ type: 'ask'; open: boolean }>
  | Readonly<{ type: 'undoRequested' }>
  | Readonly<{ type: 'undoFailed' }>
  | Readonly<{ type: 'undone' }>;

export const initialLastImport = (
  last: UndoableImport | null,
): LastImportState => ({ ask: false, last, phase: 'idle' });

/** The Undo row's own small machine: the row, the dialog, Undoing…, undone. */
export function lastImportReducer(
  state: LastImportState,
  action: LastImportAction,
): LastImportState {
  switch (action.type) {
    case 'replaced':
      return initialLastImport(action.last);
    case 'ask':
      return state.last && state.phase === 'idle'
        ? { ...state, ask: action.open }
        : state;
    case 'undoRequested':
      return state.last && state.phase === 'idle'
        ? { ...state, ask: false, phase: 'undoing' }
        : state;
    case 'undoFailed':
      return state.phase === 'undoing' ? { ...state, phase: 'idle' } : state;
    case 'undone':
      return state.phase === 'undoing' ? { ...state, phase: 'undone' } : state;
  }
}
