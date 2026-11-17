/**
 * The current history entry's key (set by NavigationTracker's script; a push
 * makes a new one, a replace keeps it). Per-entry state on Back is keyed by
 * it, not by URL: opening /123 from /456 and later from Home gives two
 * entries for the same URL, each with its own state (see README.md).
 *
 * Read it in a layout effect, not during render: `history.state` may not
 * reflect the current navigation yet while React renders.
 */
export default function getHistoryKey(): string {
  if (typeof window !== 'undefined' && window?.history.state?.key) {
    return String(window.history.state.key);
  }
  return 'index';
}
