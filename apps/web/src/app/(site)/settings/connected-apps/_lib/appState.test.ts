import { describe, expect, it } from 'vitest';

import { appSurface, isLive, plexLook, STATE_DOT, statePill } from './appState';

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

describe('plexLook', () => {
  it('draws a pause before the first scrobble as waiting: nothing has arrived', () => {
    const look = plexLook('paused', false);
    expect(look).toBe('wait');
    expect(appSurface(look)).toBe('available');
    expect(statePill(look)).toBe('Available');
  });

  it('keeps a pause after data tinted, and every other state as it is', () => {
    expect(appSurface(plexLook('paused', true))).toBe('connected');
    expect(plexLook('on', true)).toBe('on');
    expect(plexLook('wait', false)).toBe('wait');
    expect(plexLook('broken', false)).toBe('broken');
    expect(plexLook('none', false)).toBe('none');
  });
});
