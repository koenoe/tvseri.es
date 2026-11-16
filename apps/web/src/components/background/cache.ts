import type { BackgroundState } from './store';

/**
 * Background state per history entry (`history.state.key`, see
 * `@/lib/navigation/getHistoryKey`). Module-level, so it survives client
 * navigations and is empty again after a document load.
 *
 * @see js-cache-function-results - Module-level Map for caching
 */
const cache = new Map<string, BackgroundState>();

/** Remembers how an entry looked when it was left (Activity hide). */
export function saveBackground(
  historyKey: string,
  state: BackgroundState,
): void {
  cache.set(historyKey, {
    backgroundColor: state.backgroundColor,
    backgroundImage: state.backgroundImage,
  });
}

/**
 * The state an entry shows when it is (re)shown. Back to an entry restores it
 * as it was left (e.g. the carousel's slide colour); any other navigation, or
 * an entry never left before, starts from the server's props.
 */
export function restoreBackground({
  historyKey,
  initial,
  isBack,
}: Readonly<{
  historyKey: string;
  initial: BackgroundState;
  isBack: boolean;
}>): BackgroundState {
  return (isBack ? cache.get(historyKey) : undefined) ?? initial;
}
