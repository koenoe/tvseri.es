import type { SessionState } from './session';

/**
 * The search as it was on each history entry (key from `getHistoryKey()`),
 * saved when a result is opened, so Back and reopening search give the same
 * query and results. Module memory: a reload starts empty.
 */
const sessions = new Map<string, SessionState>();

export function saveSession(historyKey: string, state: SessionState) {
  const settled: SessionState =
    state.status === 'pending'
      ? {
          ...state,
          query: state.shown,
          status: state.results ? 'ready' : 'idle',
        }
      : state;
  sessions.set(historyKey, { ...settled, enterAhead: false, stalled: false });
}

export function restoreSession(historyKey: string): SessionState | null {
  return sessions.get(historyKey) ?? null;
}

export function forgetSession(historyKey: string) {
  sessions.delete(historyKey);
}
