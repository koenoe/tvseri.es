import { useRef, useCallback, useMemo } from 'react';

import getHistoryKey from '../utils/getHistoryKey';

export default function createUseRestorableRef<T>(): (
  cacheKey: string,
  initialState: T,
) => [() => T, (newState: T) => void] {
  const cached = new Map<string, T>();

  return function useRestorableRef(cacheKey: string, initialState: T) {
    const key = useMemo(() => `${cacheKey}:${getHistoryKey()}`, [cacheKey]);

    console.log({ key });

    const init = useMemo(() => {
      const cachedState = cached.get(key);
      if (cachedState !== undefined) {
        return cachedState;
      }
      return initialState;
    }, [key, initialState]);

    const ref = useRef<T>(init);

    const set = useCallback(
      (newState: T) => {
        cached.set(key, newState);
        ref.current = newState;
      },
      [key],
    );

    const get = useCallback(() => ref.current, []);

    return [get, set];
  };
}
