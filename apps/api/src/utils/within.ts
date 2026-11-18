/**
 * What `promise` settles with if it settles within `ms`, else `timedOut`.
 * The work goes on either way (it can't be cancelled): use it only for work
 * whose late outcome is harmless, such as an idempotent store. Rejects only
 * when `promise` rejects in time.
 */
export const within = async <T>(
  promise: Promise<T>,
  ms: number,
): Promise<
  Readonly<{ timedOut: false; value: T }> | Readonly<{ timedOut: true }>
> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<Readonly<{ timedOut: true }>>((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), Math.max(0, ms));
  });
  try {
    return await Promise.race([
      promise.then((value) => ({ timedOut: false as const, value })),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
};
