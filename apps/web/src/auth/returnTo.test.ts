import { describe, expect, it } from 'vitest';

import { toSafeReturnTo } from './returnTo';

describe('toSafeReturnTo', () => {
  it.each([
    ['/', '/'],
    ['/u/margaux', '/u/margaux'],
    ['/ok?x#y', '/ok?x#y'],
    [
      '/1396/breaking-bad?season=2&episode=3',
      '/1396/breaking-bad?season=2&episode=3',
    ],
  ])('keeps the same-origin path %s', (value, expected) => {
    expect(toSafeReturnTo(value)).toBe(expected);
  });

  it.each([
    '//evil.com',
    '/\\evil.com',
    '/./\\/evil.com',
    '/\t/evil.com',
    '/\n/evil.com',
    '\t//evil.com',
    'javascript:alert(1)',
    'https://evil.com/',
    'evil.com',
    '',
  ])('falls back to / for %j', (value) => {
    expect(toSafeReturnTo(value)).toBe('/');
  });

  it.each([undefined, null, 42, ['/u/margaux'], { path: '/' }])(
    'falls back to / for the non-string %j',
    (value) => {
      expect(toSafeReturnTo(value)).toBe('/');
    },
  );
});
