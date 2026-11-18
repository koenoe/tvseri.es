import { type ArrowKey, moveSelection } from '@/lib/grid/moveSelection';

import { searchKey } from './searchKey';
import type { SearchView } from './searchView';
import {
  buildSections,
  gridOf,
  type SearchCell,
  type SearchLayout,
  type SearchSection,
} from './sections';

/**
 * One open search: what was typed, what is shown, and the marker. Pure, so
 * the overlay's rules (speed and keyboard) are tested without a
 * browser:
 * - typing makes a request pending; the previous results (or the recents)
 *   stay until the next ones land, then the first cell is marked;
 * - a late answer for an older query is ignored;
 * - Enter opens the marked cell; Enter while pending (Enter-ahead) opens the
 *   first result of what was typed as soon as it lands;
 * - on the recents nothing is marked until an arrow is pressed (also while
 *   the first query is pending); a recent marked that way is what Enter
 *   opens, even while pending;
 * - a request out for 250 ms makes the screen stale (`stalled`)
 *   until an answer or a failure lands, or the field is emptied.
 */
export type SessionState = Readonly<{
  /** Enter was pressed while a request was pending */
  enterAhead: boolean;
  /** The field, as typed */
  query: string;
  /** The normalised query of the request in flight or last sent ('' none) */
  requested: string;
  results: SearchView | null;
  /** The marked cell; -1 on the recents before the first arrow */
  selected: number;
  /** What was typed for the results shown ('' = the recents) */
  shown: string;
  /**
   * A request has been out too long (the controller's `STALL_MS`): what is on
   * screen is stale (it dims; the recents give way to ghost rows)
   */
  stalled: boolean;
  status: 'error' | 'idle' | 'pending' | 'ready';
}>;

export type SessionAction =
  | Readonly<{ query: string; type: 'input' }>
  | Readonly<{ key: string; type: 'request' }>
  | Readonly<{ key: string; results: SearchView; type: 'land' }>
  | Readonly<{ key: string; type: 'fail' }>
  | Readonly<{ type: 'stall' }>
  | Readonly<{ type: 'enter' }>
  | Readonly<{ key: ArrowKey; type: 'move' }>;

export type SessionContext = Readonly<{
  layout: SearchLayout;
  recents: ReadonlyArray<SearchCell>;
}>;

export type SessionTransition = Readonly<{
  /** A cell to open now (Enter, or Enter-ahead on landing) */
  open?: SearchCell;
  state: SessionState;
}>;

export const INITIAL_SESSION: SessionState = {
  enterAhead: false,
  query: '',
  requested: '',
  results: null,
  selected: -1,
  shown: '',
  stalled: false,
  status: 'idle',
};

export type SessionView = Readonly<{
  /** Every option in order (the recents, or the result blocks flattened) */
  cells: ReadonlyArray<SearchCell>;
  /**
   * `ghosts`: the first query is stalled, so static ghost rows stand in for
   * the recents; nothing to mark or open until it lands
   */
  mode: 'error' | 'ghosts' | 'none' | 'recents' | 'results';
  sections: ReadonlyArray<SearchSection>;
  selected: number;
  /** What was typed for what is shown, trimmed (“Nothing for …”) */
  shownQuery: string;
  /** What is shown is out of date: it fades to 50% */
  stale: boolean;
}>;

/** The part of a state the panel draws (not the field, nor what is in flight) */
type ShownState = Pick<
  SessionState,
  'results' | 'selected' | 'shown' | 'stalled'
>;

/** What the panel draws for a state. */
export function sessionView(
  state: ShownState,
  { layout, recents }: SessionContext,
): SessionView {
  const shownQuery = state.shown.trim();
  const stale = state.stalled;
  if (!shownQuery && stale) {
    return {
      cells: [],
      mode: 'ghosts',
      sections: [],
      selected: -1,
      shownQuery,
      stale,
    };
  }
  if (!shownQuery) {
    return {
      cells: recents,
      mode: 'recents',
      sections: [],
      selected: Math.min(state.selected, recents.length - 1),
      shownQuery,
      stale,
    };
  }
  if (!state.results) {
    return {
      cells: [],
      mode: 'error',
      sections: [],
      selected: -1,
      shownQuery,
      stale,
    };
  }
  const sections = buildSections(state.results, layout);
  const cells = sections.flatMap((section) => section.cells);
  return {
    cells,
    mode: cells.length ? 'results' : 'none',
    sections,
    selected: cells.length
      ? Math.min(Math.max(state.selected, 0), cells.length - 1)
      : -1,
    shownQuery,
    stale,
  };
}

// The recents are one row of chips: ← → move along it, ↑ ↓ stay
const gridFor = (view: SessionView, layout: SearchLayout) =>
  view.mode === 'recents'
    ? [{ columns: Number.POSITIVE_INFINITY, size: view.cells.length }]
    : gridOf(view.sections, layout);

export function reduceSession(
  state: SessionState,
  action: SessionAction,
  context: SessionContext,
): SessionTransition {
  switch (action.type) {
    case 'input': {
      const key = searchKey(action.query);
      const base = {
        ...state,
        enterAhead: false,
        query: action.query,
        // On the recents nothing is marked until ↓: Enter would open the
        // search result, not a recent.
        selected: state.shown ? 0 : -1,
      };
      if (!key) {
        return {
          state: {
            ...base,
            requested: '',
            results: null,
            selected: -1,
            shown: '',
            stalled: false,
            status: 'idle',
          },
        };
      }
      if (key === searchKey(state.shown) && state.status === 'ready') {
        return { state: { ...base, selected: state.selected } };
      }
      return { state: { ...base, status: 'pending' } };
    }
    case 'request':
      return { state: { ...state, requested: action.key, status: 'pending' } };
    case 'land': {
      if (action.key !== state.requested) {
        return { state };
      }
      // An answer for an earlier keystroke still shows (fresher than what
      // is on screen), but the typed query stays pending: Enter waits for it.
      const current = searchKey(state.query) === action.key;
      const landed: SessionState = {
        ...state,
        enterAhead: current ? false : state.enterAhead,
        results: action.results,
        selected: 0,
        shown: current ? state.query : action.key,
        stalled: false,
        status: current ? 'ready' : 'pending',
      };
      if (!current || !state.enterAhead) {
        return { state: landed };
      }
      const first = sessionView(landed, context).cells[0];
      return first ? { open: first, state: landed } : { state: landed };
    }
    case 'fail':
      if (
        action.key !== state.requested ||
        searchKey(state.query) !== action.key
      ) {
        return { state };
      }
      return {
        state: {
          ...state,
          enterAhead: false,
          results: null,
          selected: -1,
          shown: state.query,
          stalled: false,
          status: 'error',
        },
      };
    case 'stall':
      return {
        state: state.status === 'pending' ? { ...state, stalled: true } : state,
      };
    case 'enter': {
      const view = sessionView(state, context);
      const target = view.cells[view.selected];
      // A recent marked with an arrow is a choice: it wins over Enter-ahead.
      if (state.status === 'pending' && !(view.mode === 'recents' && target)) {
        return { state: { ...state, enterAhead: true } };
      }
      return target ? { open: target, state } : { state };
    }
    case 'move': {
      const view = sessionView(state, context);
      const selected = moveSelection(
        gridFor(view, context.layout),
        view.selected,
        action.key,
      );
      return { state: { ...state, selected } };
    }
  }
}
