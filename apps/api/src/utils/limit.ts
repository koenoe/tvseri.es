import { createLimiter } from '@tvseri.es/utils';

import { logWarn } from './logWarn';

export { createLimiter };

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
    logWarn(
      `mapSettled: ${rejectedCount}/${items.length} items failed`,
      firstReason,
    );
  }

  return values;
};

/**
 * Like `mapSettled`, but a failing item never fails the whole call: the
 * failures are counted so the caller can serve (and briefly cache) a partial
 * result. Use it where a degraded answer beats a 5xx.
 */
export const mapSettledPartial = async <T, R>(
  items: ReadonlyArray<T>,
  fn: (item: T) => Promise<R | null | undefined>,
  concurrency = 8,
): Promise<Readonly<{ failed: number; values: R[] }>> => {
  const limit = createLimiter(concurrency);
  const results = await Promise.allSettled(
    items.map((item) => limit(() => fn(item))),
  );

  const values: R[] = [];
  let failed = 0;
  let firstReason: unknown;
  for (const result of results) {
    if (result.status === 'rejected') {
      failed++;
      firstReason ??= result.reason;
    } else if (result.value != null) {
      values.push(result.value);
    }
  }

  if (failed > 0) {
    logWarn(
      `mapSettledPartial: ${failed}/${items.length} items failed`,
      firstReason,
    );
  }
  return { failed, values };
};
