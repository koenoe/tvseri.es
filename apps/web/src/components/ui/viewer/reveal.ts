/**
 * Signed-in-only space before the first paint. The cached shell can't know
 * the viewer; the root pre-paint script (`lib/viewer/viewerHintsScript`)
 * reads the display cookie once (`readCookieUser`) and, when someone is
 * signed in, adds `SIGNED_IN_RULE`. Cosmetic only: the cookie is never
 * trusted for anything else (auth/cookies.ts).
 *
 * - `VIEWER_REVEAL_CLASS` (`SignedInOnly`): rendered hidden inline, shown at
 *   `--viewer-display`.
 * - `SIGNED_IN_ONLY` / `SIGNED_OUT_ONLY` attributes (Home's placeholders, the
 *   header's username): hidden by their own classes, shown or hidden here.
 */
export const VIEWER_REVEAL_CLASS = 'viewer-reveal';

/** Space held for a signed-in section that streams in (Home's Continue watching) */
export const SIGNED_IN_ONLY = 'data-signed-in-only';

/** The placeholder of what a signed-in viewer gets instead (Home's toy on "If you liked" days) */
export const SIGNED_OUT_ONLY = 'data-signed-out-only';

/**
 * The one signed-in rule. Two selectors on purpose: `[data-signed-in-only]`
 * shows without `!important`, so a page's own `hidden!` still wins (Home's
 * new user); `.viewer-reveal` has to beat its inline `display: none`.
 */
export const SIGNED_IN_RULE = `[${SIGNED_IN_ONLY}]{display:block}[${SIGNED_OUT_ONLY}]{display:none!important}.${VIEWER_REVEAL_CLASS}{display:var(--viewer-display,block)!important}`;
