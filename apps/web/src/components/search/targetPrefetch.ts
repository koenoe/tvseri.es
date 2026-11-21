/**
 * How long the marked result must stay marked before it counts as intent:
 * arrowing past results, or answers landing while typing, ask for nothing.
 */
export const TARGET_SETTLE_MS = 100;

/**
 * The marked search result (what Enter opens) counts as intent once an
 * arrow has moved onto it and it rests for `TARGET_SETTLE_MS`: its own
 * link then opens whole (`TileLink opensWhole`, a per-link prefetch), so
 * Enter or a click commits the page itself instead of its skeleton. One
 * result at a time, never for every result in view, and never for a
 * landed answer alone (only its shell).
 *
 * @example
 * const target = createTargetPrefetch(settle);
 * target.mark(cell); // later: target.cancel()
 */
export function createTargetPrefetch<T>(settle: (target: T) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  return {
    /** Typing on, the overlay closed */
    cancel,
    /** The result an arrow moved to (a landed answer alone asks for nothing) */
    mark(target: T) {
      cancel();
      if (stopped) {
        return;
      }
      timer = setTimeout(() => {
        timer = undefined;
        settle(target);
      }, TARGET_SETTLE_MS);
    },
    /**
     * A result opened: its page is on its way, and an Enter-ahead answer
     * that marks its first result after that must not ask for it again
     */
    stop() {
      stopped = true;
      cancel();
    },
  };
}
