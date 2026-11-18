/**
 * In-flight deduplication: concurrent callers asking for the same key share
 * one Promise. Per Lambda instance only (instances share no memory); the
 * Cache table is what instances share.
 */
const inFlight = new Map<string, Promise<unknown>>();

export const dedupe = async <T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const existing = inFlight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fn().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise);
  return promise;
};
