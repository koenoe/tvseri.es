'use client';

import { useRouter } from 'next/navigation';
import { useReducer, useRef, useTransition } from 'react';

import { showToast } from '@/components/ui/toast/showToast';

import { startImport } from './actions';
import { type ColumnMapping, detectSource } from './columns';
import type { ImportedShow, ImportProblem, ImportRow } from './contract';
import {
  type Fix,
  type GroupId,
  type HelpTab,
  importReducer,
  initialImportState,
} from './importState';
import {
  initialLastImport,
  lastAfterLeaving,
  lastImportReducer,
  type UndoableImport,
} from './lastImport';
import { prepareRows } from './prepareRows';
import { REJECTION_COPY, readCsv, rejectionOf } from './readCsv';
import { runChunks } from './runChunks';
import { pollUntilUndone, requestUndo } from './undo';

/** The toast's life: a fix stays undoable (and unsent) this long. */
const FIX_GRACE_MS = 6000;

/**
 * Leaving mid-import stops it (chunks are sent from this page), and a pick
 * still in its grace or on the wire would be lost: the browser asks first.
 * (Not a `keepalive` flush on `pagehide`: the route streams with
 * back-pressure and stops when its reader goes, and `pagehide` also fires
 * for the back/forward cache.)
 */
const keepPageOpen = (event: BeforeUnloadEvent) => {
  event.preventDefault();
};

/** A pick in its grace: sent when the timer fires, unless it's cancelled. */
type PendingFix = Readonly<{
  timer: ReturnType<typeof setTimeout>;
  send: () => void;
}>;

export type FixRequest = Readonly<{
  key: string;
  fix: Fix;
  /** The rows to send again, with the user's answer */
  rows: ReadonlyArray<ImportRow>;
  toast: string;
}>;

export type SkipRequest = Readonly<{
  keys: ReadonlyArray<string>;
  rows: number;
  toast: string;
}>;

/**
 * Nothing here stops when the component's effects are cleaned up: Next
 * keeps a page in `<Activity>` across a server action's refresh and Back,
 * so the import carries on and its state is there on return. Leaving the
 * site (unload) is what stops it ("Keep this page open").
 *
 * The importer's behaviour around the pure state machine: reading the file,
 * the dry run (restarted whenever the columns change), the chunked import
 * and Continue, fixes (sent after the toast's grace, so Undo is free;
 * counted once the route answers), and Undo import (picks still in their
 * grace are dropped, picks on the wire are waited for, then Undo is asked
 * for and polled until the API has finished).
 */
export function useImporter(initialLast: UndoableImport | null = null) {
  const [state, dispatch] = useReducer(importReducer, initialImportState);
  /** "Your last import" with Undo: `GET /me`'s, then this tab's once left */
  const [lastImport, lastDispatch] = useReducer(
    lastImportReducer,
    initialLast,
    initialLastImport,
  );
  const [isReading, startReading] = useTransition();
  // The nav's "Imported N episodes today" reads `GET /me` on the server: one
  // refresh when an import finishes, a pick lands or the import is undone.
  // Client state survives it (same tree); never after a stop, which may be
  // an expired session.
  const router = useRouter();
  const runIdRef = useRef(0);
  const checkRef = useRef<AbortController | null>(null);
  const importRef = useRef<AbortController | null>(null);
  const pendingFixes = useRef(new Map<string, PendingFix>());
  const sendingFixes = useRef(new Set<Promise<void>>());
  const runningRef = useRef(false);
  /** The import fixes write to; null once it's left (another file) or undone */
  const activeImportRef = useRef<string | null>(null);

  const syncLeaveWarning = () => {
    const busy =
      runningRef.current ||
      pendingFixes.current.size > 0 ||
      sendingFixes.current.size > 0;
    if (busy) {
      window.addEventListener('beforeunload', keepPageOpen);
    } else {
      window.removeEventListener('beforeunload', keepPageOpen);
    }
  };

  const runCheck = (rows: ReadonlyArray<ImportRow>, runId: number) => {
    checkRef.current?.abort();
    const controller = new AbortController();
    checkRef.current = controller;
    void runChunks({
      kind: 'check',
      // One event per write batch: its rows are the matched ones and the problems
      onEvent: (event) =>
        dispatch({
          event,
          rows: event.matched + event.problems.length,
          runId,
          type: 'checkEvent',
        }),
      rows,
      signal: controller.signal,
    }).then((outcome) => {
      if (outcome.status !== 'aborted') {
        dispatch({ ok: outcome.status === 'done', runId, type: 'checkEnded' });
      }
    });
  };

  const onFiles = (files: ReadonlyArray<File>) => {
    const rejection = rejectionOf(files);
    const [file] = files;
    if (rejection || !file) {
      showToast({ title: REJECTION_COPY[rejection ?? 'empty'], tone: 'error' });
      return;
    }
    startReading(async () => {
      const parsed = await readCsv(file);
      if (typeof parsed === 'string') {
        showToast({ title: REJECTION_COPY[parsed], tone: 'error' });
        return;
      }
      const source = detectSource(parsed.headers);
      const prepared = prepareRows(parsed.rows, source.mapping, {
        now: Date.now(),
      });
      runIdRef.current += 1;
      const runId = runIdRef.current;
      startReading(() => {
        dispatch({ file: parsed, prepared, runId, source, type: 'loaded' });
      });
      runCheck(prepared.rows, runId);
    });
  };

  const setMapping = (mapping: ColumnMapping) => {
    if (state.step !== 'check') {
      return;
    }
    const prepared = prepareRows(state.file.rows, mapping, { now: Date.now() });
    runIdRef.current += 1;
    const runId = runIdRef.current;
    startReading(() => {
      dispatch({ mapping, prepared, runId, type: 'mapping' });
    });
    runCheck(prepared.rows, runId);
  };

  const runImport = (
    importId: string,
    rows: ReadonlyArray<ImportRow>,
    from: number,
  ) => {
    importRef.current?.abort();
    const controller = new AbortController();
    importRef.current = controller;
    runningRef.current = true;
    syncLeaveWarning();
    void runChunks({
      from,
      importId,
      kind: 'import',
      onChunkDone: (chunk) => dispatch({ chunk, type: 'chunkDone' }),
      onEvent: (event) => dispatch({ event, type: 'importEvent' }),
      rows,
      signal: controller.signal,
    }).then((outcome) => {
      if (importRef.current === controller) {
        runningRef.current = false;
        syncLeaveWarning();
      }
      if (outcome.status === 'done') {
        dispatch({ type: 'importFinished' });
        router.refresh();
      } else if (outcome.status === 'stopped') {
        dispatch({
          chunk: outcome.chunk,
          reason: outcome.reason,
          type: 'importStopped',
        });
      }
    });
  };

  const createAndRun = async (rows: ReadonlyArray<ImportRow>) => {
    const created = await startImport().catch(() => null);
    if (!created?.ok) {
      dispatch({
        chunk: 0,
        reason:
          created?.error === 'unauthenticated' ? 'unauthenticated' : 'failed',
        type: 'importStopped',
      });
      return;
    }
    activeImportRef.current = created.data.importId;
    dispatch({
      createdAt: created.data.createdAt,
      importId: created.data.importId,
      type: 'importCreated',
    });
    runImport(created.data.importId, rows, 0);
  };

  const beginImport = () => {
    if (state.step !== 'check') {
      return;
    }
    checkRef.current?.abort();
    dispatch({ type: 'importStarting' });
    void createAndRun(state.prepared.rows);
  };

  const resume = () => {
    if (state.step !== 'import' || state.run.phase !== 'stopped') {
      return;
    }
    const { importId, resumeChunk } = state.run;
    const { rows } = state.prepared;
    dispatch({ type: 'importResumed' });
    if (importId) {
      runImport(importId, rows, resumeChunk);
    } else {
      // Creating the import failed: Continue creates it now
      void createAndRun(rows);
    }
  };

  /** One fix's write; what it says only lands while its import is current. */
  const writeFix = async (
    key: string,
    importId: string,
    rows: ReadonlyArray<ImportRow>,
  ) => {
    const isCurrent = () => activeImportRef.current === importId;
    dispatch({ key, type: 'fixSending' });
    let written = 0;
    let skipped = 0;
    const problems: ImportProblem[] = [];
    const shows: ImportedShow[] = [];
    const outcome = await runChunks({
      importId,
      kind: 'import',
      onEvent: (event) => {
        written += event.written;
        skipped += event.skipped;
        problems.push(...event.problems);
        shows.push(...event.shows);
      },
      rows,
      signal: new AbortController().signal,
    });
    if (!isCurrent()) {
      return;
    }
    if (outcome.status === 'done') {
      dispatch({ key, problems, shows, skipped, type: 'fixResult', written });
      // The nav's "Imported N episodes today" counts what the pick added
      if (written + skipped > 0) {
        router.refresh();
      }
    } else {
      dispatch({ key, type: 'fixFailed' });
      showToast({
        title: 'Couldn’t import that. Try it again.',
        tone: 'error',
      });
    }
  };

  const sendFix = (
    key: string,
    importId: string,
    rows: ReadonlyArray<ImportRow>,
  ) => {
    pendingFixes.current.delete(key);
    const write = writeFix(key, importId, rows).finally(() => {
      sendingFixes.current.delete(write);
      syncLeaveWarning();
    });
    sendingFixes.current.add(write);
    syncLeaveWarning();
  };

  /** Drops every pick still in its grace; `restore` puts its rows back. */
  const cancelPendingFixes = (restore: boolean) => {
    for (const [key, pending] of pendingFixes.current) {
      clearTimeout(pending.timer);
      if (restore) {
        dispatch({ fix: null, key, type: 'fix' });
      }
    }
    pendingFixes.current.clear();
    syncLeaveWarning();
  };

  const clearFix = (key: string) => {
    const pending = pendingFixes.current.get(key);
    if (pending) {
      clearTimeout(pending.timer);
    }
    pendingFixes.current.delete(key);
    syncLeaveWarning();
    dispatch({ fix: null, key, type: 'fix' });
  };

  /**
   * A doubtful match confirmed: sent when Undo has passed, counted when the
   * route answers. Not while Undo import runs (it would be undone at once).
   */
  const pick = ({ fix, key, rows, toast }: FixRequest) => {
    if (
      state.step !== 'import' ||
      !state.run.importId ||
      state.run.phase === 'undoing' ||
      state.run.phase === 'undone' ||
      activeImportRef.current !== state.run.importId
    ) {
      return;
    }
    const { importId } = state.run;
    dispatch({ fix, key, type: 'fix' });
    const send = () => sendFix(key, importId, rows);
    pendingFixes.current.set(key, {
      send,
      timer: setTimeout(send, FIX_GRACE_MS),
    });
    syncLeaveWarning();
    showToast({
      action: { label: 'Undo', onClick: () => clearFix(key) },
      duration: FIX_GRACE_MS,
      title: toast,
    });
  };

  const skip = ({ keys, rows, toast }: SkipRequest) => {
    const perKey = keys.length > 0 ? Math.round(rows / keys.length) : 0;
    for (const key of keys) {
      dispatch({ fix: { kind: 'skipped', rows: perKey }, key, type: 'fix' });
    }
    showToast({
      action: {
        label: 'Undo',
        onClick: () => {
          for (const key of keys) {
            dispatch({ fix: null, key, type: 'fix' });
          }
        },
      },
      title: toast,
    });
  };

  /** Before leaving for history or the profile: send what is still waiting. */
  const flushFixes = () => {
    for (const pending of pendingFixes.current.values()) {
      clearTimeout(pending.timer);
      pending.send();
    }
  };

  const confirmUndo = async () => {
    if (state.step !== 'import' || !state.run.importId) {
      return;
    }
    const { importId } = state.run;
    dispatch({ type: 'undoRequested' });
    // Picks in their grace are dropped (Undo would remove them anyway); picks
    // on the wire land first, so none races the undo (and none gets its 409)
    cancelPendingFixes(true);
    await Promise.allSettled(sendingFixes.current);
    if (!(await requestUndo(importId))) {
      dispatch({ type: 'undoFailed' });
      return;
    }
    activeImportRef.current = null;
    void pollUntilUndone(importId, () => {
      dispatch({ type: 'undone' });
      router.refresh();
    });
  };

  /** "Your last import" (Upload step, Stopped banner): the same Undo. */
  const confirmLastUndo = async () => {
    const { last, phase } = lastImport;
    if (!last || phase !== 'idle') {
      return;
    }
    lastDispatch({ type: 'undoRequested' });
    if (!(await requestUndo(last.importId))) {
      lastDispatch({ type: 'undoFailed' });
      return;
    }
    void pollUntilUndone(last.importId, () => {
      lastDispatch({ type: 'undone' });
      router.refresh();
    });
  };

  const anotherFile = () => {
    checkRef.current?.abort();
    importRef.current?.abort();
    runningRef.current = false;
    activeImportRef.current = null;
    cancelPendingFixes(false);
    if (state.step === 'import') {
      lastDispatch({
        last: lastAfterLeaving(state.run, lastImport.last),
        type: 'replaced',
      });
    }
    dispatch({ type: 'anotherFile' });
  };

  return {
    anotherFile,
    askLastUndo: (open: boolean) => lastDispatch({ open, type: 'ask' }),
    askUndo: (open: boolean) => dispatch({ open, type: 'askUndo' }),
    beginImport,
    clearFix,
    confirmLastUndo,
    confirmUndo,
    flushFixes,
    isReading,
    lastImport,
    onFiles,
    pick,
    resume,
    setMapping,
    setTab: (tab: HelpTab) => dispatch({ tab, type: 'tab' }),
    skip,
    state,
    toggleEdit: () => dispatch({ type: 'toggleEdit' }),
    toggleGroup: (group: GroupId) => dispatch({ group, type: 'toggleGroup' }),
    toggleUnmatched: () => dispatch({ type: 'toggleUnmatched' }),
  };
}

export type Importer = ReturnType<typeof useImporter>;
