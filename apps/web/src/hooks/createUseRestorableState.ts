import { useCallback, useRef, useState } from 'react';

import getHistoryKey from '../utils/getHistoryKey';
import { wasBackNavigation } from '../utils/navigationState';

/**
 * Creates a useState hook with in-memory caching for back-navigation restoration.
 *
 * Following js-cache-function-results pattern: module-level Map provides
 * O(1) lookups for back-navigation restoration.
 *
 * Why in-memory (not sessionStorage)?
 * - Refresh: Map clears → initial state is used (correct behavior)
 * - Back navigation: Same historyKey + wasBackNavigation() → cache hit → instant restore
 * - Forward navigation: New historyKey or !wasBackNavigation() → initial state
 *
 * Following rerender-functional-setstate pattern: setState uses functional
 * updates to avoid stale closures and unnecessary callback recreations.
 *
 * Activity reveal detection:
 * With cacheComponents, components hide/reveal instead of unmount/remount.
 * We track keyRef to detect when the component reveals with a different
 * history entry and update state accordingly.
 */
export default function createUseRestorableState<State>(): (
  cacheKey: string,
  initialState: State | (() => State),
) => [State, (action: State | ((prevState: State) => State)) => void] {
  const cache = new Map<string, State>();

  return function useRestorableState(
    cacheKey: string,
    initialState: State | (() => State),
  ) {
    const currentHistoryKey = getHistoryKey();
    const key = `${cacheKey}:${currentHistoryKey}`;

    // Track the key we're currently synced to
    const syncedKeyRef = useRef<string | null>(null);

    const getInitialState = (): State => {
      return typeof initialState === 'function'
        ? (initialState as () => State)()
        : initialState;
    };

    const [state, _setState] = useState<State>(() => {
      syncedKeyRef.current = key;

      // Only restore from cache on back navigation
      if (wasBackNavigation()) {
        const cachedState = cache.get(key);
        if (cachedState !== undefined) {
          return cachedState;
        }
      }

      // Forward navigation or no cache - use initial state
      const init = getInitialState();
      cache.set(key, init);
      return init;
    });

    // Detect Activity reveal with different historyKey
    // When key changes but component didn't remount, we need to sync state
    if (syncedKeyRef.current !== key) {
      syncedKeyRef.current = key;

      let newState: State;
      if (wasBackNavigation()) {
        // Back navigation - try to restore from cache
        const cachedState = cache.get(key);
        newState = cachedState !== undefined ? cachedState : getInitialState();
      } else {
        // Forward navigation - use fresh initial state
        newState = getInitialState();
      }

      cache.set(key, newState);
      // This setState during render is the React-approved pattern for
      // "state that depends on props" - see React docs on adjusting state during render
      _setState(newState);
    }

    // Following rerender-functional-setstate: use functional setState
    // to avoid stale closures and keep callback stable
    const setState = useCallback(
      (action: State | ((prevState: State) => State)) => {
        _setState((prev) => {
          const newState =
            typeof action === 'function'
              ? (action as (prevState: State) => State)(prev)
              : action;
          // Always update cache for future back-navigation
          cache.set(`${cacheKey}:${getHistoryKey()}`, newState);
          return newState;
        });
      },
      [cacheKey],
    );

    return [state, setState];
  };
}
