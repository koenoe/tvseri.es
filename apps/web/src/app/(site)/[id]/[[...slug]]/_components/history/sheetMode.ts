import type { SheetMode } from './paint';

export const SHEET_MODE_KEY = 'tvseries:history-mode';
const VERSION = 1;
const FIRST_MODE: SheetMode = 'date';

const isSheetMode = (value: unknown): value is SheetMode =>
  value === 'mark' || value === 'upto' || value === 'date';

/**
 * The mode the viewer last picked in the history sheet, on this browser:
 * "Tap sets a date" until they pick one. An unknown or malformed value, or
 * storage that throws (private mode, blocked), is the first-time mode.
 */
export function readSheetMode(): SheetMode {
  try {
    const raw = window.localStorage.getItem(SHEET_MODE_KEY);
    const stored: unknown = raw ? JSON.parse(raw) : null;
    if (
      stored &&
      typeof stored === 'object' &&
      'v' in stored &&
      stored.v === VERSION &&
      'mode' in stored &&
      isSheetMode(stored.mode)
    ) {
      return stored.mode;
    }
  } catch {
    // no storage, no memory
  }
  return FIRST_MODE;
}

export function rememberSheetMode(mode: SheetMode): void {
  try {
    window.localStorage.setItem(
      SHEET_MODE_KEY,
      JSON.stringify({ mode, v: VERSION }),
    );
  } catch {
    // no storage, the sheet opens in the first-time mode next time
  }
}
