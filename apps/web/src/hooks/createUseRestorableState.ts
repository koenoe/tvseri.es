import { useCallback, useMemo, useRef, useState } from 'react';

import getHistoryKey from '../utils/getHistoryKey';

/**
 * Creates a useState hook with in-memory caching for back-navigation restoration.
 *
 * Following js-cache-function-results pattern: module-level Map provides
 * O(1) lookups for back-navigation restoration.
 *
 * Why in-memory (not sessionStorage)?
 * - Refresh: Map clears → initial state is used (correct behavior)
 * - Back navigation: Same historyKey → cache hit → instant restore
 * - Forward navigation: New historyKey → cache miss → initial state
 *
 * Following rerender-functional-setstate pattern: setState uses functional
 * updates to avoid stale closures and unnecessary callback recreations.
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
    const key = useMemo(() => `${cacheKey}:${getHistoryKey()}`, [cacheKey]);
    const keyRef = useRef(key);
    keyRef.current = key;

    const [state, _setState] = useState<State>(() => {
      const cachedState = cache.get(key);
      if (cachedState !== undefined) {
        return cachedState;
      }
      const init =
        typeof initialState === 'function'
          ? (initialState as () => State)()
          : initialState;
      cache.set(key, init);
      return init;
    });

    // Following rerender-functional-setstate: use functional setState
    // to avoid stale closures and keep callback stable
    const setState = useCallback(
      (action: State | ((prevState: State) => State)) => {
        _setState((prev) => {
          const newState =
            typeof action === 'function'
              ? (action as (prevState: State) => State)(prev)
              : action;
          cache.set(keyRef.current, newState);
          return newState;
        });
      },
      [],
    );

    return [state, setState];
  };
}
