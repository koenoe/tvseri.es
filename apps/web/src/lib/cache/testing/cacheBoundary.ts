/**
 * What a caller sees of a `'use cache'` function in Next. Vitest runs no
 * `'use cache'`, so a test wraps a cached loader in this to see what
 * production sees:
 *
 * - a result crosses as a copy (it is serialised into the cache entry), so
 *   only shape-based checks such as `isUnavailable` still match it;
 * - a thrown error crosses as a plain `Error` rebuilt from the entry's Flight
 *   stream (`use-cache-wrapper.js`, `onError`): not its class, none of its
 *   fields. An `ApiError`'s `status` is gone, so `tryApi` around a cached
 *   loader can never see an outage.
 */
export const acrossCacheBoundary =
  <A extends ReadonlyArray<unknown>, R>(read: (...args: A) => Promise<R>) =>
  async (...args: A): Promise<R> => {
    let result: R;
    try {
      result = await read(...args);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
    return structuredClone(result);
  };
