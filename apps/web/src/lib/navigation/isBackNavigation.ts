/**
 * Whether the current navigation is a browser back navigation. NavigationTracker
 * sets `window.__navIsBack` on popstate, before the page renders.
 */
export default function isBackNavigation(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window as unknown as { __navIsBack?: boolean }).__navIsBack === true
  );
}
