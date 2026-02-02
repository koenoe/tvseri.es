import type { BackgroundState } from './store';

/**
 * Module-level Map cache for background state per history entry.
 * Survives SPA navigations, clears on full page refresh.
 *
 * @see js-cache-function-results - Module-level Map for caching
 */
const cache = new Map<string, BackgroundState>();

// Expose to window for pre-hydration inline script access
if (typeof window !== 'undefined') {
  (window as unknown as { __bgCache: typeof cache }).__bgCache = cache;
}

export function getBackground(historyKey: string): BackgroundState | undefined {
  return cache.get(historyKey);
}

export function setBackground(
  historyKey: string,
  state: BackgroundState,
): void {
  cache.set(historyKey, state);
}

// Re-export shared utilities for convenience
export { default as getHistoryKey } from '@/utils/getHistoryKey';
export { default as isBackNavigation } from '@/utils/isBackNavigation';
