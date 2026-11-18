import { createStore } from 'zustand/vanilla';
import type { ArrowKey } from '@/lib/grid/moveSelection';
import { createSearchClient } from './fetchSearch';
import { searchKey } from './searchKey';
import type { SearchView } from './searchView';
import type { SearchCell } from './sections';
import {
  INITIAL_SESSION,
  reduceSession,
  type SessionAction,
  type SessionContext,
  type SessionState,
  sessionView,
} from './session';

/** The debounce: one request per pause in typing. */
export const DEBOUNCE_MS = 150;

/**
 * How long the first request of a pending period may be out
 * before the screen counts as stale (Algolia's stall threshold; React's
 * stale dim). Debounce + 250 ms is at most 400 ms after the last key.
 */
export const STALL_MS = 250;

/** What the overlay hands over with every call (read when the call is made). */
export type SearchEnv = Readonly<{
  context: SessionContext;
  /** Open a result (Enter, or Enter-ahead when it lands) */
  onOpen: (cell: SearchCell) => void;
  /** Results landed: what Enter would open (the overlay prefetches it) */
  onTarget?: (cell: SearchCell) => void;
}>;

/**
 * Runs one open search: the session rules (`reduceSession`) plus time and
 * the network. 150 ms debounce; the request in flight is aborted when the
 * next one goes out; Enter during the debounce sends at once (Enter-ahead);
 * answers already fetched land without a request. 250 ms after the first
 * request of a pending period (later keys and requests don't restart it),
 * a request still out makes the screen `stalled` until an answer or a
 * failure lands, the field is emptied or the search closes.
 */
export function createSearchController(
  client: ReturnType<typeof createSearchClient> = createSearchClient(),
  initial: SessionState = INITIAL_SESSION,
) {
  const store = createStore<SessionState>(() => initial);
  let env: SearchEnv | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stallTimer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: AbortController | null = null;
  // Closed: a late answer, a timer or a key press must not open anything.
  let disposed = false;

  const dispatch = (action: SessionAction) => {
    if (!env || disposed) {
      return store.getState();
    }
    const next = reduceSession(store.getState(), action, env.context);
    store.setState(next.state, true);
    if (next.open) {
      env.onOpen(next.open);
    }
    return next.state;
  };

  const clearTimer = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const clearStall = () => {
    if (stallTimer !== undefined) {
      clearTimeout(stallTimer);
      stallTimer = undefined;
    }
  };

  // Started by the first request of a pending period only
  const startStall = () => {
    if (stallTimer !== undefined || store.getState().stalled) {
      return;
    }
    stallTimer = setTimeout(() => {
      stallTimer = undefined;
      dispatch({ type: 'stall' });
    }, STALL_MS);
  };

  const abort = () => {
    inFlight?.abort();
    inFlight = null;
  };

  const land = (key: string, results: SearchView) => {
    clearStall();
    const state = dispatch({ key, results, type: 'land' });
    const target =
      state.status === 'ready' && env
        ? sessionView(state, env.context).cells[0]
        : undefined;
    if (target) {
      env?.onTarget?.(target);
    }
  };

  const send = (key: string) => {
    if (disposed) {
      return;
    }
    clearTimer();
    abort();
    dispatch({ key, type: 'request' });
    const hit = client.cached(key);
    if (hit) {
      land(key, hit);
      return;
    }
    startStall();
    const request = new AbortController();
    inFlight = request;
    client.fetchSearch(key, request.signal).then(
      (results) => {
        if (request.signal.aborted) {
          return;
        }
        if (inFlight === request) {
          inFlight = null;
        }
        land(key, results);
      },
      () => {
        if (request.signal.aborted) {
          return;
        }
        inFlight = null;
        clearStall();
        dispatch({ key, type: 'fail' });
      },
    );
  };

  return {
    /** Closing: stops the timer and the request, and opens nothing after. */
    dispose() {
      disposed = true;
      clearTimer();
      clearStall();
      abort();
      if (store.getState().stalled) {
        store.setState({ stalled: false });
      }
    },
    enter(nextEnv: SearchEnv) {
      env = nextEnv;
      dispatch({ type: 'enter' });
      if (timer !== undefined) {
        send(searchKey(store.getState().query));
      }
    },
    /** Sends a debounced request now (a prefilled query). */
    flush(nextEnv: SearchEnv) {
      env = nextEnv;
      if (timer !== undefined) {
        send(searchKey(store.getState().query));
      }
    },
    input(query: string, nextEnv: SearchEnv) {
      env = nextEnv;
      clearTimer();
      const state = dispatch({ query, type: 'input' });
      const key = searchKey(query);
      if (state.status !== 'pending') {
        clearStall();
        abort();
        return;
      }
      if (inFlight && key === state.requested) {
        return;
      }
      if (client.cached(key)) {
        send(key);
        return;
      }
      timer = setTimeout(() => send(key), DEBOUNCE_MS);
    },
    move(key: ArrowKey, nextEnv: SearchEnv) {
      env = nextEnv;
      return dispatch({ key, type: 'move' });
    },
    /**
     * Open again after a `dispose` that wasn't a close: React re-attaches the
     * dialog in development (Strict Mode runs a ref's cleanup and the ref
     * again). Takes input again and sends the search the stop cut off;
     * without it every keystroke after the re-attach would be dropped.
     */
    resume(nextEnv: SearchEnv) {
      env = nextEnv;
      if (!disposed) {
        return;
      }
      disposed = false;
      const state = store.getState();
      const key = searchKey(state.query);
      if (state.status === 'pending' && key) {
        send(key);
      }
    },
    retry(nextEnv: SearchEnv) {
      env = nextEnv;
      const key = searchKey(store.getState().query);
      if (key) {
        send(key);
      }
    },
    store,
  };
}
