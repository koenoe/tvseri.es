import { isGridKey, moveSelection } from '@/lib/grid/moveSelection';

/**
 * Keyboard movement in the Remote's key grid (“↓ → ← ↑ move between
 * the two rows”), on the shared grid module (one block per row of keys).
 * `rows` holds each row's key count in order (the big key is a row of one),
 * keys are numbered across rows; -1 = nothing focused (opened by mouse),
 * which moves as if on the first key. Null when `key` doesn't move focus.
 */
export function moveInGrid(
  rows: ReadonlyArray<number>,
  index: number,
  key: string,
): number | null {
  if (!isGridKey(key)) {
    return null;
  }
  const blocks = rows.map((size) => ({ columns: size, size }));
  return moveSelection(blocks, Math.max(index, 0), key);
}

type LetterEvent = Readonly<{
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
}>;

/**
 * The key whose letter was pressed (`aria-keyshortcuts`, one letter each), or
 * -1. Browser and OS shortcuts (with ⌘, Ctrl or Alt) are left alone.
 */
export function shortcutTarget(
  shortcuts: ReadonlyArray<string | null | undefined>,
  event: LetterEvent,
): number {
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.key.length !== 1
  ) {
    return -1;
  }
  const letter = event.key.toUpperCase();
  return shortcuts.findIndex((shortcut) => shortcut?.toUpperCase() === letter);
}
