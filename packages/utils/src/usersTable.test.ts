import { describe, expect, it } from 'vitest';

import { emailKey, userKey, usernameKey } from './usersTable';

describe('Users table keys', () => {
  it('gives one address one email key, however it is typed', () => {
    const key = emailKey('ana@example.com');
    expect(key).toBe(
      `EMAIL#${Buffer.from('ana@example.com').toString('base64url')}`,
    );
    expect(emailKey('  Ana@Example.COM ')).toBe(key);
  });

  it('looks a username up by its slug, which a stored username already is', () => {
    expect(usernameKey('Wren R')).toBe('USERNAME#wren-r');
    expect(usernameKey('calm-otter-412')).toBe('USERNAME#calm-otter-412');
  });

  it('keys a user by id', () => {
    expect(userKey('01J')).toBe('USER#01J');
  });
});
