import { describe, expect, it } from 'vitest';

import generateUsername from './generateUsername';
import toSlug from './toSlug';

describe('toSlug', () => {
  it('lowercases and joins words with single hyphens', () => {
    expect(toSlug('Wren R')).toBe('wren-r');
    expect(toSlug('a  b')).toBe('a-b');
  });

  it('drops characters a username cannot hold', () => {
    expect(toSlug('wren_r!')).toBe('wrenr');
    expect(toSlug('Åke Öst')).toBe('ake-ost');
  });

  it('keeps hyphens and trims them at the ends', () => {
    expect(toSlug('wren-r')).toBe('wren-r');
    expect(toSlug('--wren--r--')).toBe('wren-r');
  });

  it('is empty when nothing usable is left', () => {
    expect(toSlug('!!!')).toBe('');
    expect(toSlug('')).toBe('');
  });

  it('is idempotent', () => {
    const once = toSlug('Hello, World 42');
    expect(toSlug(once)).toBe(once);
  });

  it('agrees with the generated usernames and the username schema', () => {
    const generated = generateUsername();
    expect(toSlug(generated)).toBe(generated);
    // The rule `UsernameSchema` (packages/schemas) enforces on writes
    expect(toSlug('Wren R, the 2nd!')).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});
