/**
 * Minimal promise concurrency limiter (p-limit style).
 *
 * Use it to bound fan-out to external services (TMDB, Lambda, DynamoDB)
 * so one request can't fire hundreds of parallel calls.
 *
 * Never call a limited function from inside another task of the same limiter:
 * with every slot taken, the nested call would wait forever.
 */
export const createLimiter = (concurrency: number) => {
  let active = 0;
  const queue: Array<() => void> = [];

  const runNext = () => {
    if (active >= concurrency) {
      return;
    }
    const task = queue.shift();
    if (task) {
      active++;
      task();
    }
  };

  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      queue.push(() => {
        Promise.resolve()
          .then(fn)
          .then(resolve, reject)
          .finally(() => {
            active--;
            runNext();
          });
      });
      runNext();
    });
};

// Above this share of rejected items, mapSettled throws instead of returning a
// degraded (and cacheable) list
const MAX_FAILURE_RATIO = 0.1;

/**
 * Maps over items with bounded concurrency. Nullish results (e.g. a 404) are
 * dropped, and the order of the remaining results is kept. An odd rejected
 * item is dropped too (logged), but if more than 10% reject, it throws so the
 * caller fails with an uncached error and the next request retries.
 */
export const mapSettled = async <T, R>(
  items: ReadonlyArray<T>,
  fn: (item: T) => Promise<R | null | undefined>,
  concurrency = 8,
): Promise<R[]> => {
  const limit = createLimiter(concurrency);
  const results = await Promise.allSettled(
    items.map((item) => limit(() => fn(item))),
  );

  const values: R[] = [];
  let rejectedCount = 0;
  let firstReason: unknown;

  for (const result of results) {
    if (result.status === 'rejected') {
      rejectedCount++;
      firstReason ??= result.reason;
    } else if (result.value != null) {
      values.push(result.value);
    }
  }

  if (rejectedCount > items.length * MAX_FAILURE_RATIO) {
    throw new Error(
      `mapSettled: ${rejectedCount}/${items.length} items failed`,
      { cause: firstReason },
    );
  }

  if (rejectedCount > 0) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: `mapSettled: ${rejectedCount}/${items.length} items failed`,
        reason:
          firstReason instanceof Error
            ? firstReason.message
            : String(firstReason),
      }),
    );
  }

  return values;
};
