/**
 * Owner or visitor, decided before the first paint. A profile's static shell
 * can't know who is looking (that is the session), but the URL names whose
 * profile it is and the display cookie names the viewer: when they differ, the
 * shell shows the visitor's placeholders instead of the owner's, so nothing
 * moves when the page streams in. Cosmetic only, like the display cookie.
 *
 * The shell renders both variants (`OwnerVisitor`); the owner's shows unless
 * this rule is on, in an adopted stylesheet (no DOM node for hydration to trip
 * over). The root pre-paint script makes the sheet on a hard load; the
 * profile layout's `OwnerVisitorSync` keeps it right on client navigations.
 */
export const OWNER_VARIANT_CLASS = 'ph-owner';
export const VISITOR_VARIANT_CLASS = 'ph-visitor';

/** On the window: the sheet the pre-paint script made, for the layout to update */
export const OWNER_VISITOR_SHEET = '__tvOwnerVisitorSheet';

export const VISITOR_RULE = `.${OWNER_VARIANT_CLASS}{display:none!important}.${VISITOR_VARIANT_CLASS}{display:contents!important}`;

/** Is this someone else's profile? (case-insensitive: usernames are) */
export const isVisitorOf = (
  pageUsername: string,
  viewerUsername: string | null,
): boolean =>
  viewerUsername !== null &&
  pageUsername.toLowerCase() !== viewerUsername.toLowerCase();

/**
 * The pre-paint rule, embedded by its source in the root pre-paint script
 * (`lib/viewer/viewerHintsScript`), so self-contained. On someone else's
 * profile (`/u/:name`, `viewer` the display cookie's name): a sheet with
 * `rule`, kept on `win[key]` for `OwnerVisitorSync` (which makes one itself
 * when there is none). On your own profile, off one or signed out: nothing,
 * the owner's placeholders show.
 */
export function applyOwnerVisitor(
  pathname: string,
  viewer: string | null,
  sheet: (css: string) => CSSStyleSheet,
  rule: string,
  key: string,
  win: Record<string, unknown>,
): void {
  const name = /^\/u\/([^/]+)/.exec(pathname)?.[1];
  if (
    name &&
    viewer &&
    decodeURIComponent(name).toLowerCase() !== viewer.toLowerCase()
  ) {
    win[key] = sheet(rule);
  }
}
