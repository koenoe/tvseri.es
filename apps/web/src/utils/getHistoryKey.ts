/**
 * Returns a unique key for the current history entry.
 *
 * NavigationTracker's pre-hydration script assigns a random key
 * (`Math.random().toString(36).slice(2)`) to each `history.state` entry.
 * pushState creates a new key; replaceState preserves the existing one.
 *
 * This key is used by BackgroundProvider and Carousel to cache per-entry
 * state in module-level Maps — enabling instant restoration on back-nav
 * without confusing entries that share the same URL (e.g. navigating
 * /tv/123 -> /tv/456 -> back -> /tv/123 creates two distinct /tv/123
 * history entries, each with its own key and cached state).
 *
 * Prefer calling this from useLayoutEffect rather than during render,
 * since history.state is external mutable state and may not yet reflect
 * the current navigation when React's render function runs.
 *
 * @see NavigationTracker - Sets history.state.key
 * @see BackgroundProvider - Caches background color/image per key
 * @see Carousel - Caches carousel index per key
 */
export default function getHistoryKey(): string {
  if (typeof window !== 'undefined' && window?.history.state?.key) {
    return String(window.history.state.key);
  }
  return 'index';
}
