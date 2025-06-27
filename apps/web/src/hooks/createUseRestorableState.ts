import { useCallback, useMemo, useState } from 'react';

import getHistoryKey from '../utils/getHistoryKey';

export default function createUseRestorableState<State>(): (
  cacheKey: string,
  initialState: State | (() => State),
) => [State, (action: State | ((prevState: State) => State)) => void] {
  const cached = new Map<string, State>();

  return function useRestorableState(
    cacheKey: string,
    initialState: State | (() => State),
  ) {
    const key = useMemo(() => `${cacheKey}:${getHistoryKey()}`, [cacheKey]);

    const init = useMemo(() => {
      const cachedState = cached.get(key);
      if (cachedState !== undefined) {
        return cachedState;
      }
      return typeof initialState === 'function'
        ? (initialState as () => State)()
        : initialState;
    }, [key, initialState]);

    const [_state, _setState] = useState<State>(init);

    const setState = useCallback(
      (action: State | ((prevState: State) => State)) => {
        const newState =
          typeof action === 'function'
            ? (action as (prevState: State) => State)(_state)
            : action;
        cached.set(key, newState);
        _setState(newState);
      },
      [key, _state],
    );

    return [_state, setState];
  };
}
