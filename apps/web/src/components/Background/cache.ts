import type { BackgroundState } from './store';

/**
 * Module-level Map cache for background state per history entry.
 * Survives SPA navigations, clears on full page refresh.
 *
 * @see js-cache-function-results - Module-level Map for caching
 */
const cache = new Map<string, BackgroundState>();

// Expose to window so the pre-hydration inline script in BackgroundStyle.tsx
// can read cached background colors before React hydrates. The script runs as
// a synchronous <script> tag in the SSR HTML — it can't import ES modules,
// so it reads from window.__bgCache directly. This is what prevents the
// background color flash on back-navigation.
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
