import { describe, expect, it } from 'vitest';

import { shortOverview, spotlightKicker } from './kicker';

const today = new Date('2026-11-11T12:00:00Z');

describe('spotlightKicker', () => {
  it('says when a season comes back', () => {
    expect(
      spotlightKicker(
        {
          lastYear: 2025,
          next: { airDate: '2026-11-17', episodeNumber: 1 },
          running: true,
        },
        today,
      ),
    ).toBe('Returning Tue Nov 17');
  });

  it('adds the year when the date is not this year', () => {
    expect(
      spotlightKicker(
        {
          lastYear: 2025,
          next: { airDate: '2027-04-12', episodeNumber: 1 },
          running: true,
        },
        today,
      ),
    ).toBe('Returning Apr 12, 2027');
  });

  it('writes September as "Sep", never "Sept"', () => {
    expect(
      spotlightKicker(
        {
          lastYear: 2025,
          next: { airDate: '2027-09-14', episodeNumber: 1 },
          running: true,
        },
        today,
      ),
    ).toBe('Returning Sep 14, 2027');
  });

  it('calls a mid-season date a new episode', () => {
    expect(
      spotlightKicker(
        {
          lastYear: 2026,
          next: { airDate: '2026-11-19', episodeNumber: 4 },
          running: true,
        },
        today,
      ),
    ).toBe('New episode Thu Nov 19');
  });

  it('falls back to "Still running" without a date, and to the end year for a finished show', () => {
    expect(
      spotlightKicker({ lastYear: 2025, next: null, running: true }, today),
    ).toBe('Still running');
    expect(
      spotlightKicker({ lastYear: 2025, next: null, running: false }, today),
    ).toBe('Finished in 2025');
    expect(
      spotlightKicker({ lastYear: null, next: null, running: false }, today),
    ).toBe('Finished');
  });
});

describe('shortOverview', () => {
  it('keeps a short overview as it is', () => {
    expect(shortOverview('  A new resort.  The same slow disaster. ')).toBe(
      'A new resort. The same slow disaster.',
    );
  });

  it('keeps whole sentences that fit', () => {
    const text = `${'A'.repeat(60)}. ${'B'.repeat(60)}. ${'C'.repeat(60)}.`;
    expect(shortOverview(text, 130)).toBe(
      `${'A'.repeat(60)}. ${'B'.repeat(60)}.`,
    );
  });

  it('cuts a too-long first sentence at a word', () => {
    expect(shortOverview('one two three four five six', 12)).toBe('one two…');
  });
});
