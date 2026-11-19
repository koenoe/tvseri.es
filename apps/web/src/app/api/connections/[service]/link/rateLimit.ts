/**
 * A sliding window in this instance's memory. Capped at `maxKeys` so a spray
 * from many addresses can't grow it: expired keys go first, then the least
 * recently seen.
 */
export function createRateLimiter({
  max,
  maxKeys,
  windowMs,
}: Readonly<{ max: number; maxKeys: number; windowMs: number }>) {
  const tries = new Map<string, ReadonlyArray<number>>();

  const prune = (now: number) => {
    for (const [key, times] of tries) {
      if (times.every((at) => now - at >= windowMs)) {
        tries.delete(key);
      }
    }
    // Map order is insertion order, and a hit re-inserts its key
    for (const key of tries.keys()) {
      if (tries.size < maxKeys) {
        break;
      }
      tries.delete(key);
    }
  };

  return {
    /** Counts a try; false when the key is over its limit (not counted). */
    allow(key: string, now = Date.now()): boolean {
      const recent = (tries.get(key) ?? []).filter((at) => now - at < windowMs);
      tries.delete(key);
      if (recent.length >= max) {
        tries.set(key, recent);
        return false;
      }
      if (tries.size >= maxKeys) {
        prune(now);
      }
      tries.set(key, [...recent, now]);
      return true;
    },
    /** How many keys are held (tests). */
    get size(): number {
      return tries.size;
    },
  };
}
