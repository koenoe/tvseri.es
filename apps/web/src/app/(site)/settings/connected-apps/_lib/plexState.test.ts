import { describe, expect, it } from 'vitest';

import { plexStateFrom, plexStateOf } from '../../_lib/plexState';

describe('plexStateOf', () => {
  it('is none until connected', () => {
    expect(plexStateOf({ connected: false })).toBe('none');
  });

  const base = {
    connected: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    lastAccount: null,
    onlyAccount: null,
    recent: [],
    urlWorks: true,
    week: [],
  } as const;

  it('waits for the first scrobble, then receives', () => {
    expect(plexStateOf({ ...base, lastReceivedAt: null, paused: false })).toBe(
      'wait',
    );
    expect(plexStateOf({ ...base, lastReceivedAt: 1, paused: false })).toBe(
      'on',
    );
  });

  it('paused wins over both', () => {
    expect(plexStateOf({ ...base, lastReceivedAt: 1, paused: true })).toBe(
      'paused',
    );
    expect(plexStateFrom(true, true, false)).toBe('paused');
    expect(plexStateFrom(false, true, true)).toBe('none');
  });

  it('is broken when the edge refuses the URL, whatever else is true', () => {
    expect(
      plexStateOf({
        ...base,
        lastReceivedAt: 1,
        paused: true,
        urlWorks: false,
      }),
    ).toBe('broken');
    expect(plexStateFrom(true, false, false, false)).toBe('broken');
    expect(plexStateFrom(false, false, false, false)).toBe('none');
  });
});
