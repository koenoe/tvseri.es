/**
 * Navigation state utilities for detecting back vs forward navigation.
 *
 * Uses the TanStack Router pattern: track a navigation index in history.state
 * and compare indices on popstate to determine direction.
 *
 * These utilities read from window globals set by NavigationTracker.tsx,
 * which runs as an inline script before React hydration.
 *
 * Following rerender-defer-reads pattern: read synchronously when needed,
 * don't subscribe to navigation state changes.
 */

declare global {
  interface Window {
    __navIndex: number;
    __navIsBack: boolean;
  }
}

/**
 * Returns true if the current navigation was a back navigation.
 *
 * Back navigation is detected when popstate fires with a lower navigation
 * index than the current index (newIndex < currentIndex).
 *
 * Must be called synchronously during render - the value is set by the
 * popstate handler before React starts its transition.
 */
export function wasBackNavigation(): boolean {
  return typeof window !== 'undefined' && window.__navIsBack === true;
}

/**
 * Returns the current navigation index.
 *
 * The index increments on each forward navigation (pushState) and is
 * stored in history.state.__navIndex, allowing comparison on popstate.
 */
export function getNavigationIndex(): number {
  return typeof window !== 'undefined' ? (window.__navIndex ?? 0) : 0;
}
