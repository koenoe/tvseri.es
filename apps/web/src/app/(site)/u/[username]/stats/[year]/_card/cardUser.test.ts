import { describe, expect, it } from 'vitest';

import { exactUser, isCardUsername } from './cardUser';

describe('isCardUsername', () => {
  it('takes a username as the schema writes it', () => {
    expect(isCardUsername('nina')).toBe(true);
    expect(isCardUsername('nina-2')).toBe(true);
  });

  it('takes a username stored before the slug rule', () => {
    expect(isCardUsername('Nina_R')).toBe(true);
    expect(isCardUsername('n.i.n.a')).toBe(true);
    expect(isCardUsername('nina smith')).toBe(true);
  });

  it('refuses a length no username has', () => {
    expect(isCardUsername('ni')).toBe(false);
    expect(isCardUsername('')).toBe(false);
    expect(isCardUsername('n'.repeat(129))).toBe(false);
  });
});

describe('exactUser', () => {
  const nina = { id: 'stub-user-nina', username: 'nina' };

  it('is the user when the param is their username', () => {
    expect(exactUser('nina', nina)).toBe(nina);
  });

  it('is null for another spelling the lookup also found', () => {
    expect(exactUser('nina-', nina)).toBeNull();
    expect(exactUser('ninaa', nina)).toBeNull();
  });

  it('is null without a user', () => {
    expect(exactUser('nina', null)).toBeNull();
  });
});
