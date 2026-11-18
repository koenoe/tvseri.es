import { createStore, type StoreApi } from 'zustand/vanilla';

/** The most shows one bulk action takes */
export const SELECT_MAX = 50;

export type SelectionState = Readonly<{
  selecting: boolean;
  selected: ReadonlySet<number>;
  /** The last tile clicked without Shift: where a Shift-click run starts */
  anchor: number | null;
}>;

/** What a toggle did: `capped` when the run would pass the cap (nothing changes) */
export type ToggleResult = 'added' | 'removed' | 'capped';

export type SelectionActions = Readonly<{
  start: () => void;
  stop: () => void;
  clear: () => void;
  /**
   * A click on a tile; `order` is the loaded tiles' order (for a Shift run,
   * Google Photos: from the anchor to here, both directions).
   */
  toggle: (
    id: number,
    options?: Readonly<{ range?: boolean; order?: ReadonlyArray<number> }>,
  ) => ToggleResult;
  /** Drops ids that left the shelf (after a removal) */
  forget: (ids: ReadonlyArray<number>) => void;
}>;

export type SelectionStore = StoreApi<SelectionState & SelectionActions>;

/** The ids from `anchor` to `id` in `order`, both included, in list order; `[id]` when the anchor is gone */
export function rangeBetween(
  order: ReadonlyArray<number>,
  anchor: number | null,
  id: number,
): ReadonlyArray<number> {
  const to = order.indexOf(id);
  const from = anchor === null ? -1 : order.indexOf(anchor);
  if (to === -1 || from === -1) {
    return [id];
  }
  const [low, high] = from < to ? [from, to] : [to, from];
  return order.slice(low, high + 1);
}

const EMPTY: ReadonlySet<number> = new Set();

/**
 * Select mode's state, one store per shelf view: a click
 * toggles, Shift-click adds a run from the last click, at most 50.
 */
export function createSelectionStore(): SelectionStore {
  return createStore<SelectionState & SelectionActions>((set, get) => ({
    anchor: null,
    clear: () => set({ anchor: null, selected: EMPTY }),
    forget: (ids) => {
      const selected = new Set(get().selected);
      for (const id of ids) {
        selected.delete(id);
      }
      set({ selected });
    },
    selected: EMPTY,
    selecting: false,
    start: () => set({ anchor: null, selected: EMPTY, selecting: true }),
    stop: () => set({ anchor: null, selected: EMPTY, selecting: false }),
    toggle: (id, { order = [], range = false } = {}) => {
      const { anchor, selected } = get();
      if (range && anchor !== null && anchor !== id) {
        const run = rangeBetween(order, anchor, id);
        const next = new Set(selected);
        for (const each of run) {
          next.add(each);
        }
        if (next.size > SELECT_MAX) {
          return 'capped';
        }
        set({ selected: next, selecting: true });
        return 'added';
      }
      const next = new Set(selected);
      if (next.has(id)) {
        next.delete(id);
        set({ anchor: id, selected: next });
        return 'removed';
      }
      if (next.size >= SELECT_MAX) {
        return 'capped';
      }
      next.add(id);
      set({ anchor: id, selected: next, selecting: true });
      return 'added';
    },
  }));
}
