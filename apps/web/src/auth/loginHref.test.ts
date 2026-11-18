// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { loginHref, loginHrefHere } from './loginHref';

describe('loginHref', () => {
  it('returns to the page with its query after signing in', () => {
    expect(loginHref('/1396/breaking-bad?season=2')).toBe(
      '/api/auth/login?returnTo=%2F1396%2Fbreaking-bad%3Fseason%3D2',
    );
  });

  it('returns home from the root', () => {
    expect(loginHref('/')).toBe('/api/auth/login?returnTo=%2F');
  });

  it.each(['//evil.com', 'https://evil.com', '/\\evil.com', null])(
    'returns home instead of to %s',
    (returnTo) => {
      expect(loginHref(returnTo)).toBe('/api/auth/login?returnTo=%2F');
    },
  );
});

describe('loginHrefHere', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('keeps the current query (season, filters)', () => {
    window.history.replaceState(null, '', '/1396/breaking-bad?season=2#cast');

    expect(loginHrefHere()).toBe(
      '/api/auth/login?returnTo=%2F1396%2Fbreaking-bad%3Fseason%3D2',
    );
  });
});
