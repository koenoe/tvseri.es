/**
 * In-flight request deduplication for TMDB API calls.
 *
 * Prevents duplicate concurrent requests to the same TMDB endpoint
 * within a single Lambda invocation. Multiple callers requesting the
 * same resource will share the same Promise.
 *
 * Note: This is request-scoped (not cross-invocation) since Lambda
 * instances don't share memory. For cross-invocation caching, use
 * the DynamoDB cache layer.
 */
const inFlight = new Map<string, Promise<unknown>>();

export async function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fn().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise);
  return promise;
}
