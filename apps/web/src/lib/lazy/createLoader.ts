/** A chunk loaded once for the page (`createLoader`) */
export type Loader<T> = Readonly<{
  /** The loaded value, or null before it is in (and after a failure) */
  get: () => T | null;
  /** Loads it, sharing one request between callers */
  load: () => Promise<T>;
  /** `load` for a moment the result isn't needed (idle, a sign of intent) */
  preload: () => void;
}>;

/**
 * Loads a chunk once and shares the promise. A failed import (a flaky
 * connection, an old chunk after a deploy) is forgotten, so the next call
 * tries again instead of failing for the rest of the session. `get` gives
 * the loaded value synchronously, for a component that renders it directly
 * once it is in (a `lazy()` component suspends on its first render even
 * when its chunk is in, and React holds a revealed boundary back ~300ms).
 */
export function createLoader<T>(importer: () => Promise<T>): Loader<T> {
  let loaded: T | null = null;
  let loading: Promise<T> | null = null;
  const load = () => {
    loading ??= importer().then(
      (value) => {
        loaded = value;
        return value;
      },
      (error: unknown) => {
        loading = null;
        throw error;
      },
    );
    return loading;
  };
  return {
    get: () => loaded,
    load,
    preload: () => {
      load().catch(() => undefined);
    },
  };
}
