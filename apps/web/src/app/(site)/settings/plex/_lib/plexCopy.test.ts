import { describe, expect, it } from 'vitest';

import { whoChoiceOf, whoLine } from './plexCopy';

describe('Plex copy', () => {
  it('reads whose plays count from the saved account', () => {
    expect(whoChoiceOf(null)).toBe('all');
    expect(whoChoiceOf(7)).toBe('me');
  });

  it('explains each choice, and why "Only" is off before a first play', () => {
    expect(whoLine('me', true)).toMatch(/other Plex users/);
    expect(whoLine('all', true)).toMatch(/Every play/);
    expect(whoLine('all', false)).toMatch(/Once Plex has sent a play/);
  });
});
