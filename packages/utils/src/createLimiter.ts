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
