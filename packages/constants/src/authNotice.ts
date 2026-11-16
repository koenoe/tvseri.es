/**
 * The notices the site can ask the sign-in page to show (`?notice=` on the
 * issuer's `/authorize`). Only these codes exist: the page renders fixed copy
 * for each and ignores anything else, so the URL can't put text on the page.
 */
const AUTH_NOTICES = ['google_cancelled', 'google_unverified'] as const;

export type AuthNotice = (typeof AUTH_NOTICES)[number];

export const isAuthNotice = (value: unknown): value is AuthNotice =>
  typeof value === 'string' &&
  (AUTH_NOTICES as readonly string[]).includes(value);

/**
 * The issuer's `access_denied` description when a Google account has no
 * verified email; the site callback tells it apart from a cancel by this text.
 */
export const GOOGLE_UNVERIFIED_DESCRIPTION =
  'Your Google account has no verified email address';
