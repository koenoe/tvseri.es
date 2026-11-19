import { describe, expect, it } from 'vitest';

import { isLive, STATE_DOT, statePill } from './appState';

describe('app states', () => {
  it('keeps Plex’s five as they were', () => {
    expect(STATE_DOT).toMatchObject({
      broken: 'none',
      none: 'none',
      on: 'receiving',
      paused: 'paused',
      wait: 'wait',
    });
    expect(statePill('on')).toBe('Connected');
    expect(statePill('paused')).toBe('Connected');
    expect(statePill('wait')).toBe('Available');
  });

  it('adds unavailable: a dash, its own pill, never live', () => {
    expect(STATE_DOT.unavailable).toBe('dash');
    expect(statePill('unavailable')).toBe('Unavailable');
    expect(isLive('unavailable')).toBe(false);
  });
});
