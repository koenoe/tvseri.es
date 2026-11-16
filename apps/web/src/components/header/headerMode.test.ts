import { describe, expect, it } from 'vitest';

import { modeOnFocus, trackScroll } from './headerMode';

const at = (
  y: number,
  mode: 'static' | 'floating' | 'hidden',
  peakY = y,
  path: string | null = '/',
) => ({ lastY: y, mode, path, peakY }) as const;

describe('trackScroll', () => {
  it.each([0, 40, 60])('is the static bar at or under 60px (%i)', (y) => {
    expect(trackScroll(at(500, 'floating'), { path: '/', y }).mode).toBe(
      'static',
    );
  });

  it.each([
    [60, 61],
    [100, 400],
  ])('hides the header scrolling down past 60px (%i → %i)', (from, y) => {
    expect(trackScroll(at(from, 'static'), { path: '/', y }).mode).toBe(
      'hidden',
    );
  });

  it('hides the pill on the first pixel down', () => {
    expect(
      trackScroll(at(500, 'floating', 520), { path: '/', y: 501 }),
    ).toEqual(at(501, 'hidden'));
  });

  it('keeps the header hidden for the first 7px up (the tolerance)', () => {
    const down = trackScroll(at(300, 'hidden'), { path: '/', y: 500 });
    expect(down).toEqual(at(500, 'hidden'));
    const wobble = trackScroll(down, { path: '/', y: 496 });
    expect(wobble).toEqual(at(496, 'hidden', 500));
    expect(trackScroll(wobble, { path: '/', y: 493 })).toEqual(
      at(493, 'hidden', 500),
    );
  });

  it('shows the pill once the way up since the turn reaches 8px', () => {
    const down = trackScroll(at(300, 'hidden'), { path: '/', y: 500 });
    const up = trackScroll(down, { path: '/', y: 492 });
    expect(up).toEqual(at(492, 'floating', 500));
    expect(trackScroll(up, { path: '/', y: 491 }).mode).toBe('floating');
  });

  it('measures the 8px from the latest turn, not an earlier one', () => {
    let tracker = trackScroll(at(300, 'hidden'), { path: '/', y: 500 });
    tracker = trackScroll(tracker, { path: '/', y: 495 });
    tracker = trackScroll(tracker, { path: '/', y: 498 });
    tracker = trackScroll(tracker, { path: '/', y: 491 });
    expect(tracker).toEqual(at(491, 'hidden', 498));
    expect(trackScroll(tracker, { path: '/', y: 490 }).mode).toBe('floating');
  });

  it('resets to the static bar after a navigation', () => {
    expect(
      trackScroll(at(900, 'floating'), { path: '/discover', y: 0 }),
    ).toEqual(at(0, 'static', 0, '/discover'));
  });

  it('resets even when the new page keeps a deep scroll position (Back)', () => {
    expect(
      trackScroll(at(300, 'hidden', 300, '/discover'), {
        path: '/1396/breaking-bad',
        y: 1200,
      }),
    ).toEqual(at(1200, 'static', 1200, '/1396/breaking-bad'));
  });

  it('treats a new query string as a navigation', () => {
    expect(
      trackScroll(at(900, 'floating', 900, '/1396'), {
        path: '/1396?season=2',
        y: 880,
      }).mode,
    ).toBe('static');
  });

  it('starts static on the first scroll it sees', () => {
    expect(
      trackScroll(at(0, 'static', 0, null), { path: '/', y: 700 }),
    ).toEqual(at(700, 'static'));
  });
});

describe('modeOnFocus', () => {
  it('brings the hidden header back as the pill when a key moves focus into it', () => {
    expect(modeOnFocus('hidden')).toBe('floating');
  });

  it.each(['static', 'floating'] as const)(
    'leaves the %s header as it is',
    (mode) => {
      expect(modeOnFocus(mode)).toBe(mode);
    },
  );
});
