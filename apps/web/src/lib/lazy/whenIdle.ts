type IdleOptions = Readonly<{
  /** Runs the task after this long even when the browser never idles (ms) */
  timeout?: number;
  /** The wait where `requestIdleCallback` is missing (Safari), in ms */
  fallbackDelay?: number;
}>;

/**
 * Runs a task once the browser is idle (a chunk to preload, a prefetch), on
 * a timer where `requestIdleCallback` is missing. Browser only. Returns the
 * cancel, so an effect can return it as its cleanup.
 */
export default function whenIdle(
  task: () => void,
  { fallbackDelay, timeout }: IdleOptions = {},
): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const options = timeout === undefined ? undefined : { timeout };
    const handle = window.requestIdleCallback(() => task(), options);
    return () => window.cancelIdleCallback(handle);
  }
  const timer = window.setTimeout(task, fallbackDelay);
  return () => window.clearTimeout(timer);
}
