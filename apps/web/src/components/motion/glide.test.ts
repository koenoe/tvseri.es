import { describe, expect, it } from 'vitest';

import { GLIDE, glideTiming } from './glide';

describe('glideTiming', () => {
  it('keeps a hop to the next choice at the shared pace', () => {
    expect(glideTiming(100, 100)).toEqual(GLIDE);
    expect(glideTiming(-120, 100)).toEqual(GLIDE);
  });

  it('gives a longer jump more time, on the sheet curve', () => {
    const timing = glideTiming(300, 100);
    expect(timing.duration).toBe(320);
    expect(timing.easing).toBe('cubic-bezier(0.32, 0.72, 0, 1)');
    expect(timing.fill).toBe(GLIDE.fill);
  });

  it('never takes longer than 360ms, however far the jump', () => {
    expect(glideTiming(2000, 100).duration).toBe(360);
  });

  it('keeps the shared pace when the step is unknown', () => {
    expect(glideTiming(300, 0)).toEqual(GLIDE);
  });
});
