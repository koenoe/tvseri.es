import { describe, expect, it } from 'vitest';

import { isFinished } from './viewingActivity';

const video = (bookmark: number | null, runtime: number, credits?: number) => ({
  bookmarkPosition: bookmark === null ? null : { value: bookmark },
  creditsOffset: credits === undefined ? null : { value: credits },
  runtime: { value: runtime },
});

// Positions as Netflix gave them for a real history
describe('isFinished', () => {
  it('counts a position past the credits', () => {
    expect(isFinished(video(2122, 2294, 2085))).toBe(true);
  });

  it('counts 90% of the runtime when there is no credits mark', () => {
    expect(isFinished(video(2340, 2600))).toBe(true);
  });

  it('never counts a title stopped partway', () => {
    expect(isFinished(video(1218, 6430, 6188))).toBe(false);
    expect(isFinished(video(1, 6491, 5977))).toBe(false);
  });

  it('never counts a title without a position or runtime', () => {
    expect(isFinished(video(null, 2600, 2400))).toBe(false);
    expect(isFinished(undefined)).toBe(false);
    expect(isFinished({ runtime: { value: 0 } })).toBe(false);
  });
});
