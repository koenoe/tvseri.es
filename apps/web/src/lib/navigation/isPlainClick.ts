type Click = Readonly<{
  altKey: boolean;
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}>;

/**
 * A primary click with no modifier: it follows a link in this tab (a
 * ⌘/Ctrl/Shift/Alt click or a middle click opens or saves it elsewhere).
 */
export const isPlainClick = (event: Click): boolean =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;
