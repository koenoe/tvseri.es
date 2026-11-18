import type { WatchProvider } from '@tvseri.es/schemas';

/** A tap on a tile */
export type ToggleAction = Readonly<{
  provider: WatchProvider;
  type: 'add' | 'remove';
}>;

export type WatchProviderAction =
  | ToggleAction
  /** A drag or the Move menu: the services in this order (by id) */
  | Readonly<{ order: ReadonlyArray<number>; type: 'reorder' }>;

/**
 * The viewer's selected services, in their order (the first one wins Where
 * to watch): add at the end (never twice), remove by id, reorder by ids.
 */
export function servicesReducer(
  state: ReadonlyArray<WatchProvider>,
  action: WatchProviderAction,
): ReadonlyArray<WatchProvider> {
  if (action.type === 'reorder') {
    return reorder(state, action.order);
  }
  const { provider } = action;
  const has = state.some((p) => p.id === provider.id);
  if (action.type === 'add') {
    return has ? state : [...state, provider];
  }
  return has ? state.filter((p) => p.id !== provider.id) : state;
}

/**
 * `state` in the order of `order`; a service it doesn't name (added while
 * the drag ran) keeps its place after them. The same order: `state` itself.
 */
function reorder(
  state: ReadonlyArray<WatchProvider>,
  order: ReadonlyArray<number>,
): ReadonlyArray<WatchProvider> {
  const rank = new Map(order.map((id, index) => [id, index]));
  const next = [...state].sort(
    (a, b) =>
      (rank.get(a.id) ?? Number.POSITIVE_INFINITY) -
      (rank.get(b.id) ?? Number.POSITIVE_INFINITY),
  );
  return next.every((p, index) => p === state[index]) ? state : next;
}

/** The ids of `list` with the one at `from` moved to `to` (the Move menu) */
export function movedOrder(
  list: ReadonlyArray<Pick<WatchProvider, 'id'>>,
  from: number,
  to: number,
): ReadonlyArray<number> {
  const ids = list.map((p) => p.id);
  const [id] = ids.splice(from, 1);
  if (id !== undefined) {
    ids.splice(to, 0, id);
  }
  return ids;
}

/** A tap on a tile: take it off when it is selected, else put it on. */
export function toggleAction(
  state: ReadonlyArray<WatchProvider>,
  provider: WatchProvider,
): ToggleAction {
  return {
    provider,
    type: state.some((p) => p.id === provider.id) ? 'remove' : 'add',
  };
}
