/**
 * Back closes an open side panel (boards README, "Side panels": the menu,
 * the awards sheet and the watch-history sheet behave the same). A panel
 * without a URL of its own holds one history entry while it is open: opening
 * pushes it (same URL, so nothing renders), Back pops it and closes the
 * panel, Forward doesn't reopen it, and a close by ✕, Escape or the dim goes
 * back over it, so none stays behind. (The watch-history sheet has a URL,
 * `?history`, and does the same through the show page's `urlState`.)
 */

/** Marks the history entry an open panel pushed */
const PANEL_ENTRY = 'tvPanel';

/** Is the current history entry an open panel's? */
const isPanelEntry = (): boolean => {
  const state: unknown = window.history.state;
  return (
    typeof state === 'object' &&
    state !== null &&
    PANEL_ENTRY in state &&
    state[PANEL_ENTRY] === true
  );
};

/**
 * Pushes the panel's entry (unless it is already the current one) and calls
 * `onBack` when a history move leaves it. Returns the undo, which stops
 * listening.
 */
export function holdPanelEntry(onBack: () => void): () => void {
  if (!isPanelEntry()) {
    window.history.pushState({ [PANEL_ENTRY]: true }, '');
  }
  const handlePopState = () => {
    if (!isPanelEntry()) {
      onBack();
    }
  };
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}

/** Closes over the panel's entry: back over it when it is the current one */
export function leavePanelEntry(): boolean {
  if (!isPanelEntry()) {
    return false;
  }
  window.history.back();
  return true;
}
