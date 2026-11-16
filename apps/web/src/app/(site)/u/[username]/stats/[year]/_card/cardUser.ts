/**
 * Whose card a URL names. The API finds users by a slug of the param, so
 * `/u/NINA/…` and `/u/n.i.n.a/…` would find nina too: the card and the
 * og:image answer only the exact username, so each card has one URL (one
 * render, one CDN entry). Anything else is a 404 that isn't cached.
 */

/**
 * A param that can be a username at all (no I/O: checked first): the
 * length every stored username has, whatever its characters (the slug rule
 * is for writes, older names may have capitals or an underscore). The exact
 * match below is what makes a card's URL unique.
 */
export const isCardUsername = (param: string): boolean =>
  param.length >= 3 && param.length <= 128;

/** The user the param names, only when it's their exact username */
export const exactUser = <T extends Readonly<{ username: string }>>(
  param: string,
  user: T | null,
): T | null => (user !== null && user.username === param ? user : null);
