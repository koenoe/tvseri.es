import { describe, expect, it } from 'vitest';

import { STATUS_TEXT, whoChoiceOf, whoLine } from './plexCopy';

describe('Plex copy', () => {
  it('has the four status lines', () => {
    expect(STATUS_TEXT.none).toBe('Not connected');
    expect(STATUS_TEXT.wait).toBe('Waiting for the first scrobble');
    expect(STATUS_TEXT.on).toBe('Receiving · last scrobble ');
    expect(STATUS_TEXT.paused).toBe('Paused · Plex plays aren’t marked');
  });

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
