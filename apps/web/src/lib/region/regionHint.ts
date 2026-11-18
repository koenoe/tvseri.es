import type { regionLine } from './regionLine';

/**
 * The viewer's region on this browser, so Discover's "Streaming in …" line
 * is right at first paint from the second visit on (no shift), and
 * `/api/region` is asked at most once a day. Cosmetic only, like the display
 * cookie: `{ v, u, r, t }` = version, display username ('' signed out),
 * region code, when it was fetched.
 */
export const REGION_HINT_KEY = 'tvseries:region';
export const REGION_HINT_VERSION = 1;
export const REGION_HINT_MAX_AGE_MS = 86_400_000;

type HintStorage = Pick<Storage, 'getItem'> | null;

/**
 * The stored region for this viewer while it is fresh, else null. Self-
 * contained (the pre-paint script embeds its source); every access can throw.
 */
export function readRegionHint(
  storage: HintStorage,
  user: string | null,
  now: number,
  key: string,
  version: number,
  maxAge: number,
): string | null {
  try {
    const raw = storage?.getItem(key);
    const hint = raw ? JSON.parse(raw) : null;
    if (
      hint &&
      hint.v === version &&
      hint.u === (user ?? '') &&
      typeof hint.r === 'string' &&
      /^[A-Z]{2}$/.test(hint.r) &&
      typeof hint.t === 'number' &&
      now - hint.t >= 0 &&
      now - hint.t < maxAge
    ) {
      return hint.r;
    }
  } catch {
    // unreadable: no hint
  }
  return null;
}

/**
 * Before the first paint: `--region-line` (the line's text, for the reserved
 * slot's `::after`) and `data-region` on `<html>`: `stored` (draw it, it is
 * this viewer's) or `guess` (from the browser's language: only its width is
 * reserved, as a placeholder bar). Both are outside what React hydrates: a
 * custom property in an adopted stylesheet (`adopt`, the pre-paint script's
 * shared helper) and an attribute on `<html>`, like `lib/viewer/htmlHints`.
 * Self-contained: the pre-paint script (`lib/viewer/viewerHintsScript`) is
 * its source.
 */
export function applyRegionHint(
  root: Pick<HTMLElement, 'setAttribute'>,
  adopt: (declarations: string) => void,
  storage: HintStorage,
  /** the display cookie's username, null signed out */
  user: string | null,
  now: number,
  language: string,
  key: string,
  version: number,
  maxAge: number,
  read: typeof readRegionHint,
  line: typeof regionLine,
): void {
  try {
    const stored = read(storage, user, now, key, version, maxAge);
    const locale = /^[a-z]{2,3}-([a-z]{2})(?:-|$)/i.exec(language);
    const text = line(stored ?? locale?.[1] ?? 'US');
    if (!/^[^"\\\n]{1,80}$/.test(text)) {
      return;
    }
    adopt(`--region-line:"${text}"`);
    root.setAttribute('data-region', stored ? 'stored' : 'guess');
  } catch {
    // no stylesheet support or storage: the slot keeps its default width
  }
}
