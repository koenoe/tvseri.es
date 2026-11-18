import type { UserCheck } from './me';
import type { SessionState } from './session';

/**
 * What the proxy does with a request, given its resolved session. Pure, so
 * every combination is tested; `proxy.ts` only applies it.
 */
export type ProxyDecision = Readonly<{
  /**
   * - `keep`: leave the display cookie as it is.
   * - `delete`: drop it (no session behind it).
   * - `renewWith`: set it with the session's lifetime: its current value, or,
   *   when missing (right after login, or a session from before the cookie
   *   existed), the username from `/me` fetched with this access token.
   */
  display: 'keep' | 'delete' | Readonly<{ renewWith: string }>;
  /**
   * `unauthorized`: answer 401 instead of running the route.
   * `unavailable`: answer 503 (the session exists but can't be refreshed
   * right now), so a client never mistakes an auth outage for a sign-out.
   */
  response: 'next' | 'unauthorized' | 'unavailable';
  /**
   * The session cookie, both on the response and on the request forwarded to
   * the route, so `cookies()` downstream sees what the browser will.
   */
  session: 'keep' | 'delete' | Readonly<{ set: string }>;
}>;

type RequestFacts = Readonly<{
  hasDisplayCookie: boolean;
  /** A route that requires a session (see `isProtectedApiPath`). */
  isProtectedApi: boolean;
}>;

// `/api/u/:username`, `/api/me` (the viewer's own data: marking, library
// ids) and `/api/admin`, and everything below them.
const PROTECTED_API = /^\/api\/(?:u\/[^/]+|me|admin)(?:\/|$)/;

/**
 * User API routes require a session: the proxy answers 401 for them. User
 * pages check the session themselves (`unauthorized()`).
 */
export function isProtectedApiPath(pathname: string): boolean {
  return PROTECTED_API.test(pathname);
}

export function decide(
  state: SessionState,
  { hasDisplayCookie, isProtectedApi }: RequestFacts,
): ProxyDecision {
  const withoutSession = isProtectedApi ? 'unauthorized' : 'next';

  switch (state.status) {
    case 'none':
      // A display cookie without a session (e.g. one deleted by hand) would
      // show a logged-in header.
      return {
        display: hasDisplayCookie ? 'delete' : 'keep',
        response: withoutSession,
        session: 'keep',
      };
    case 'invalid':
      return { display: 'delete', response: withoutSession, session: 'delete' };
    // A stale session (auth server unreachable while the token is expired) is
    // still a session: keep the cookies and let the next request retry. A
    // user API can't serve it, but it isn't signed out either.
    case 'stale':
      return {
        display: 'keep',
        response: isProtectedApi ? 'unavailable' : 'next',
        session: 'keep',
      };
    // The display cookie is only filled in when missing; its lifetime is
    // renewed with the session's on refresh, not on every request.
    case 'valid':
      return {
        display: hasDisplayCookie
          ? 'keep'
          : { renewWith: state.tokens.accessToken },
        response: 'next',
        session: 'keep',
      };
    case 'refreshed':
      return {
        display: { renewWith: state.tokens.accessToken },
        response: 'next',
        session: { set: state.cookie },
      };
  }
}

/**
 * A `renewWith` decision once `/me` has answered for its access token (the
 * proxy asks on every refresh and whenever the display cookie is missing):
 *
 * - `gone`: the user was deleted. The session can never work again, so it
 *   ends here exactly like a refused refresh: both cookies go and a user API
 *   answers 401. Otherwise a deleted user's other browsers would keep a valid
 *   token (the issuer still refreshes it) and a handle in the header while
 *   every page says "Sign in".
 * - `user`: the display cookie takes the current username.
 * - `unknown` (an outage, a token the API couldn't verify): nothing ends; the
 *   display cookie keeps its value, or stays missing until `/me` answers.
 */
export function afterUserCheck(
  decision: ProxyDecision,
  check: UserCheck,
  facts: RequestFacts & Readonly<{ displayCookie: string | undefined }>,
): Readonly<{
  decision: ProxyDecision;
  username: string | undefined;
}> {
  if (check.kind === 'gone') {
    return {
      decision: decide({ status: 'invalid' }, facts),
      username: undefined,
    };
  }
  if (check.kind === 'user') {
    return {
      decision,
      username: check.user.username,
    };
  }
  return { decision, username: facts.displayCookie };
}
