/**
 * Hints for placeholders that depend on the viewer or on the date, set on
 * `<html>` before the first paint so CSS can pick the right placeholder with
 * no request (the server HTML is the same for everyone). React would report
 * these attributes as a hydration mismatch, so the root layout's `<html>`
 * carries `suppressHydrationWarning` (one element deep, nothing below it):
 *
 * - `data-home="new|member"` on Home, for a signed-in viewer: `new` when the
 *   library hint on this browser is empty (that slot is Get started, 232px
 *   tall, not Continue watching's 454), else `member`.
 * - `data-show-prompt="no"` on a show route when this browser knows the
 *   first-tracking prompt ("Seen The Bear before?", part of the static shell
 *   for everyone) is not for this viewer: signed in, the show is in their
 *   library hint or they answered it here; signed out, they dismissed it
 *   here (`PROMPT_HINT_KEY`). The prompt is hidden by CSS before the first
 *   paint, so nothing moves when the viewer's marks arrive.
 * - `data-stats-year="finished|current|future"` on a stats route, from the
 *   year in the path against the current year: a finished year has a Share row.
 * - `data-plex="none|wait|on|paused"` (and `data-plex-n`, how many recent
 *   plays the card lists) on `/settings/connected-apps`, for a signed-in viewer whose
 *   Plex hint is on this browser: the connected card is much taller than the
 *   not-connected one, so its placeholder takes the viewer's last known shape.
 *
 * Cosmetic only, like the display cookie: nothing is ever authorised on it.
 */

/** The viewer's tracked show ids (`persistLibraryHint`), one entry per browser. */
export const LIBRARY_HINT_KEY = 'tvseries:library-hint';
export const LIBRARY_HINT_VERSION = 1;

/**
 * Shows whose first-tracking prompt this browser's viewer answered (signed
 * in, `u` = their display username) or dismissed (signed out, `u` = ''):
 * `{ v, u, ids }`, written by the prompt (`rememberPromptAnswer`).
 */
export const PROMPT_HINT_KEY = 'tvseries:first-tracking-hint';
export const PROMPT_HINT_VERSION = 1;

/** The Plex card's last known state, one entry per browser (`persistPlexHint`). */
export const PLEX_HINT_KEY = 'tvseries:plex-hint';
export const PLEX_HINT_VERSION = 1;

/**
 * Sets (or clears) the hints for a path. Self-contained on purpose: the root
 * pre-paint script (`viewerHintsScript`) is this function's source
 * (`.toString()`), and client navigations call it too (`RouteHints`), so it
 * must not use anything from outside it. Small on purpose: every HTML
 * document carries it. Every storage access can throw.
 */
export function applyHtmlHints(
  root: Pick<HTMLElement, 'removeAttribute' | 'setAttribute'>,
  path: string,
  /** the display cookie's username (`readCookieUser`), null signed out */
  user: string | null,
  storage: Pick<Storage, 'getItem' | 'removeItem'> | null,
  year: number,
  key: string,
  version: number,
  plexKey: string,
  plexVersion: number,
  promptKey: string,
  promptVersion: number,
): void {
  try {
    for (const name of [
      'home',
      'show-prompt',
      'stats-year',
      'plex',
      'plex-n',
    ]) {
      root.removeAttribute(`data-${name}`);
    }
    const stats = /^\/u\/[^/]+\/stats\/(\d{4})(?:\/|$)/.exec(path);
    if (stats) {
      const shown = Number(stats[1]);
      root.setAttribute(
        'data-stats-year',
        shown < year ? 'finished' : shown === year ? 'current' : 'future',
      );
    }
    // a stored hint of this version for this viewer ('' signed out), or null
    const read = (name: string, v: number, owner: string) => {
      const raw = storage?.getItem(name);
      const hint = raw ? JSON.parse(raw) : null;
      return hint && hint.v === v && hint.u === owner ? hint : null;
    };
    const show = /^\/(\d+)(?:\/|$)/.exec(path);
    const id = Number(show?.[1]);
    // the series is in this list of ids (the library, or the prompts
    // answered here: dismissed signed out)
    const listed = (hint: { ids?: unknown } | null) =>
      Array.isArray(hint?.ids) && hint.ids.indexOf(id) > -1;
    const noPrompt = () => root.setAttribute('data-show-prompt', 'no');
    if (!user) {
      // Signed out: nothing of the last viewer stays on this browser
      storage?.removeItem(key);
      storage?.removeItem(plexKey);
      if (show && listed(read(promptKey, promptVersion, ''))) {
        noPrompt();
      }
      return;
    }
    if (/^\/settings\/connected-apps\/?$/.test(path)) {
      const plex = read(plexKey, plexVersion, user);
      if (plex && ['none', 'wait', 'on', 'paused'].indexOf(plex.s) > -1) {
        root.setAttribute('data-plex', plex.s);
        if (plex.n >= 1 && plex.n <= 5) {
          root.setAttribute('data-plex-n', String(plex.n));
        }
      }
      return;
    }
    const home = path === '/';
    if (!home && !show) {
      return;
    }
    // Home without storage or a hint: a member, as when there is none yet
    const library = read(key, version, user);
    if (home) {
      // a signed-in viewer whose library is known to be empty is new
      root.setAttribute(
        'data-home',
        Array.isArray(library?.ids) && !library.ids.length ? 'new' : 'member',
      );
    } else if (
      listed(library) ||
      listed(read(promptKey, promptVersion, user))
    ) {
      noPrompt();
    }
  } catch {
    // no storage, no hint: the page draws without it
  }
}
