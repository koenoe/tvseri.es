import type { WatchProvider } from '@tvseri.es/schemas';

export type WatchProviderAction = Readonly<{
  provider: WatchProvider;
  type: 'add' | 'remove';
}>;

/**
 * The viewer's selected services: add at the end (never twice), remove by
 * id.
 */
export function servicesReducer(
  state: ReadonlyArray<WatchProvider>,
  { provider, type }: WatchProviderAction,
): ReadonlyArray<WatchProvider> {
  if (type === 'add') {
    return state.some((p) => p.id === provider.id)
      ? state
      : [...state, provider];
  }
  return state.some((p) => p.id === provider.id)
    ? state.filter((p) => p.id !== provider.id)
    : state;
}

/** A tap on a tile: take it off when it is selected, else put it on. */
export function toggleAction(
  state: ReadonlyArray<WatchProvider>,
  provider: WatchProvider,
): WatchProviderAction {
  return {
    provider,
    type: state.some((p) => p.id === provider.id) ? 'remove' : 'add',
  };
}
