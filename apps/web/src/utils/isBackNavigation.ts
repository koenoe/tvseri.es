/**
 * Check if the current navigation is a back/forward browser navigation.
 * This relies on NavigationTracker setting window.__navIsBack before page renders.
 *
 * @see js-cache-function-results - Module-level check for navigation type
 */
export default function isBackNavigation(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window as unknown as { __navIsBack: boolean }).__navIsBack === true
  );
}
