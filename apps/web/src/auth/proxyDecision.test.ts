import { describe, expect, it } from 'vitest';

import { afterUserCheck, decide, isProtectedApiPath } from './proxyDecision';
import type { SessionState } from './session';

const TOKENS = {
  accessToken: 'access-1',
  expiresAt: 1_800_000_000,
  refreshToken: 'refresh-1',
};

const STATES = {
  invalid: { status: 'invalid' },
  none: { status: 'none' },
  refreshed: { cookie: 'new-cookie', status: 'refreshed', tokens: TOKENS },
  stale: { status: 'stale' },
  valid: { status: 'valid', tokens: TOKENS },
} satisfies Record<string, SessionState>;

describe('decide', () => {
  // [state, protected API, display cookie] => decision
  it.each([
    [
      'none',
      false,
      false,
      { display: 'keep', response: 'next', session: 'keep' },
    ],
    [
      'none',
      false,
      true,
      { display: 'delete', response: 'next', session: 'keep' },
    ],
    [
      'none',
      true,
      false,
      { display: 'keep', response: 'unauthorized', session: 'keep' },
    ],
    [
      'none',
      true,
      true,
      { display: 'delete', response: 'unauthorized', session: 'keep' },
    ],

    [
      'invalid',
      false,
      false,
      { display: 'delete', response: 'next', session: 'delete' },
    ],
    [
      'invalid',
      false,
      true,
      { display: 'delete', response: 'next', session: 'delete' },
    ],
    [
      'invalid',
      true,
      false,
      { display: 'delete', response: 'unauthorized', session: 'delete' },
    ],
    [
      'invalid',
      true,
      true,
      { display: 'delete', response: 'unauthorized', session: 'delete' },
    ],

    // The auth server was unreachable: still a session, retried next request.
    [
      'stale',
      false,
      false,
      { display: 'keep', response: 'next', session: 'keep' },
    ],
    [
      'stale',
      false,
      true,
      { display: 'keep', response: 'next', session: 'keep' },
    ],
    // A user API can't serve it: 503, never a 401 that reads as signed out.
    [
      'stale',
      true,
      false,
      { display: 'keep', response: 'unavailable', session: 'keep' },
    ],
    [
      'stale',
      true,
      true,
      { display: 'keep', response: 'unavailable', session: 'keep' },
    ],

    [
      'valid',
      false,
      false,
      { display: { renewWith: 'access-1' }, response: 'next', session: 'keep' },
    ],
    [
      'valid',
      false,
      true,
      { display: 'keep', response: 'next', session: 'keep' },
    ],
    [
      'valid',
      true,
      false,
      { display: { renewWith: 'access-1' }, response: 'next', session: 'keep' },
    ],
    [
      'valid',
      true,
      true,
      { display: 'keep', response: 'next', session: 'keep' },
    ],

    [
      'refreshed',
      false,
      false,
      {
        display: { renewWith: 'access-1' },
        response: 'next',
        session: { set: 'new-cookie' },
      },
    ],
    [
      'refreshed',
      false,
      true,
      {
        display: { renewWith: 'access-1' },
        response: 'next',
        session: { set: 'new-cookie' },
      },
    ],
    [
      'refreshed',
      true,
      false,
      {
        display: { renewWith: 'access-1' },
        response: 'next',
        session: { set: 'new-cookie' },
      },
    ],
    [
      'refreshed',
      true,
      true,
      {
        display: { renewWith: 'access-1' },
        response: 'next',
        session: { set: 'new-cookie' },
      },
    ],
  ] as const)(
    '%s, protected API: %s, display cookie: %s',
    (state, isProtectedApi, hasDisplayCookie, expected) => {
      expect(
        decide(STATES[state], { hasDisplayCookie, isProtectedApi }),
      ).toEqual(expected);
    },
  );
});

describe('isProtectedApiPath', () => {
  it.each([
    '/api/u/margaux',
    '/api/u/margaux/',
    '/api/u/margaux/watched',
    '/api/u/margaux/list/watchlist',
    '/api/u/margaux/stats/2024',
    '/api/me/library-ids',
    '/api/me/series/1396',
  ])('protects %s', (path) => {
    expect(isProtectedApiPath(path)).toBe(true);
  });

  it.each([
    '/api/u',
    '/api/u/',
    '/api/user/margaux',
    '/api/tv/1396',
    '/u/margaux',
    '/api/media/1',
  ])('leaves %s alone', (path) => {
    expect(isProtectedApiPath(path)).toBe(false);
  });
});

describe('afterUserCheck', () => {
  const USER = {
    createdAt: '2024-01-01T00:00:00.000Z',
    id: 'user-1',
    role: 'user' as const,
    username: 'margaux',
    version: 1,
  };

  const facts = (isProtectedApi: boolean, displayCookie?: string) => ({
    displayCookie,
    hasDisplayCookie: displayCookie !== undefined,
    isProtectedApi,
  });

  it.each([
    ['valid', false],
    ['refreshed', false],
    ['valid', true],
    ['refreshed', true],
  ] as const)('signs a gone user out (%s, protected API %s)', (state, api) => {
    const decision = decide(STATES[state], facts(api, 'margaux'));
    expect(
      afterUserCheck(decision, { kind: 'gone' }, facts(api, 'margaux')),
    ).toEqual({
      decision: {
        display: 'delete',
        response: api ? 'unauthorized' : 'next',
        session: 'delete',
      },
      username: undefined,
    });
  });

  it('takes the current username from /me', () => {
    const decision = decide(STATES.refreshed, facts(false, 'old-name'));
    expect(
      afterUserCheck(decision, { kind: 'user', user: USER }, facts(false)),
    ).toEqual({ decision, username: 'margaux' });
  });

  // An outage never ends a session: everything stays as it was
  it.each([
    ['refreshed', 'margaux'],
    ['valid', undefined],
  ] as const)(
    'keeps the session when /me cannot answer (%s)',
    (state, cookie) => {
      const decision = decide(STATES[state], facts(true, cookie));
      expect(
        afterUserCheck(decision, { kind: 'unknown' }, facts(true, cookie)),
      ).toEqual({ decision, username: cookie });
    },
  );
});
