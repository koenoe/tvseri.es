type KeyChord = Readonly<{
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
}>;

const KEYS = new Set(['f', 'k']);

/**
 * ⌘K or ⌘F on a Mac, Ctrl+K or Ctrl+F elsewhere: opens and closes search
 * (⌘F replaces the browser's find on purpose).
 */
export function isSearchShortcut(event: KeyChord, isMac: boolean): boolean {
  const modifier = isMac
    ? event.metaKey && !event.ctrlKey
    : event.ctrlKey && !event.metaKey;
  return (
    modifier &&
    !event.altKey &&
    !event.shiftKey &&
    KEYS.has(event.key.toLowerCase())
  );
}

export const isMacPlatform = () =>
  typeof navigator !== 'undefined' &&
  /mac|iphone|ipad/i.test(navigator.userAgent);
