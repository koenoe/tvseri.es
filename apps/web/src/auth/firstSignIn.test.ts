import { describe, expect, it } from 'vitest';

import { isFirstSignIn } from './firstSignIn';

const STARTED = Date.parse('2026-11-13T10:00:00Z');

describe('isFirstSignIn', () => {
  it('is yes for an account created during this login', () => {
    expect(isFirstSignIn('2026-11-13T10:01:12Z', STARTED)).toBe(true);
  });

  it('allows a minute of clock difference between the auth server and the site', () => {
    expect(isFirstSignIn('2026-11-13T09:59:30Z', STARTED)).toBe(true);
    expect(isFirstSignIn('2026-11-13T09:58:30Z', STARTED)).toBe(false);
  });

  it('is no for an older account, a login without a start time, or a bad date', () => {
    expect(isFirstSignIn('2025-06-01T08:00:00Z', STARTED)).toBe(false);
    expect(isFirstSignIn('2026-11-13T10:01:12Z', null)).toBe(false);
    expect(isFirstSignIn('not a date', STARTED)).toBe(false);
  });
});
