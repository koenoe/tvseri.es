import { describe, expect, it } from 'vitest';

import generateUsername from './generateUsername';
import toUsernameSlug from './toUsernameSlug';

describe('toUsernameSlug', () => {
  it('lowercases and joins words with single hyphens', () => {
    expect(toUsernameSlug('Wren R')).toBe('wren-r');
    expect(toUsernameSlug('a  b')).toBe('a-b');
  });

  it('drops characters a username cannot hold', () => {
    expect(toUsernameSlug('wren_r!')).toBe('wrenr');
    expect(toUsernameSlug('Åke Öst')).toBe('ake-ost');
  });

  it('keeps hyphens and trims them at the ends', () => {
    expect(toUsernameSlug('wren-r')).toBe('wren-r');
    expect(toUsernameSlug('--wren--r--')).toBe('wren-r');
  });

  it('is empty when nothing usable is left', () => {
    expect(toUsernameSlug('!!!')).toBe('');
    expect(toUsernameSlug('')).toBe('');
  });

  it('is idempotent', () => {
    const once = toUsernameSlug('Hello, World 42');
    expect(toUsernameSlug(once)).toBe(once);
  });

  it('agrees with the generated usernames and the username schema', () => {
    const generated = generateUsername();
    expect(toUsernameSlug(generated)).toBe(generated);
    // The rule `UsernameSchema` (packages/schemas) enforces on writes
    expect(toUsernameSlug('Wren R, the 2nd!')).toMatch(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
    );
  });
});
