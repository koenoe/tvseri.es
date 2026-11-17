import { describe, expect, it } from 'vitest';

import { readDisplayUsername } from './displayUsername';

describe('readDisplayUsername', () => {
  it('reads the username from the display cookie', () => {
    expect(readDisplayUsername('__tvseries_user=margaux')).toBe('margaux');
  });

  it('finds it among other cookies', () => {
    expect(
      readDisplayUsername('theme=dark; __tvseries_user=margaux; other=1'),
    ).toBe('margaux');
  });

  it('decodes a URL-encoded value', () => {
    expect(readDisplayUsername('__tvseries_user=j%C3%BCrgen%20b')).toBe(
      'jürgen b',
    );
  });

  it('is null without the cookie (signed out)', () => {
    expect(readDisplayUsername('')).toBeNull();
    expect(readDisplayUsername('theme=dark; other=1')).toBeNull();
  });

  it('is null for an empty value', () => {
    expect(readDisplayUsername('__tvseries_user=')).toBeNull();
  });

  it('is null for a value that is not valid URL encoding', () => {
    expect(readDisplayUsername('__tvseries_user=%E0%A4%A')).toBeNull();
  });

  it('ignores a cookie whose name only ends the same', () => {
    expect(readDisplayUsername('x__tvseries_user=mallory')).toBeNull();
  });
});
