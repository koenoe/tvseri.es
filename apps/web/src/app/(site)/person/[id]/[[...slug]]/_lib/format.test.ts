import { describe, expect, it } from 'vitest';

import { allSeriesLabel, formatDay, summary, yearsBetween } from './format';

describe('formatDay', () => {
  it('formats a full day, else the year', () => {
    expect(formatDay('1956-03-07')).toBe('Mar 7, 1956');
    expect(formatDay('1956')).toBe('1956');
    expect(formatDay('1956-03')).toBe('1956');
    expect(formatDay('soon')).toBe('');
  });
});

describe('yearsBetween', () => {
  it('counts whole years, the birthday included', () => {
    expect(yearsBetween('1956-03-07', '2026-03-06')).toBe(69);
    expect(yearsBetween('1956-03-07', '2026-03-07')).toBe(70);
    expect(yearsBetween('1962-06-07', '2023-03-17')).toBe(60);
  });

  it('needs two full dates', () => {
    expect(yearsBetween('1956', '2026-03-07')).toBeUndefined();
    expect(yearsBetween('2030-01-01', '2026-03-07')).toBeUndefined();
  });
});

describe('summary', () => {
  it('keeps whole sentences up to about 160 characters', () => {
    const bio =
      'Bryan Lee Cranston (born March 7, 1956) is an American actor. After taking minor roles in television, he established himself as a leading actor in both comedic and dramatic works.';
    expect(summary(bio)).toBe(
      'Bryan Lee Cranston (born March 7, 1956) is an American actor.',
    );
    expect(summary('Short.\n\nBio.')).toBe('Short. Bio.');
    expect(summary('')).toBeUndefined();
  });

  it('cuts a first sentence that is too long at a word', () => {
    const long = `${'word '.repeat(60)}end.`;
    const cut = summary(long) ?? '';
    expect(cut.length).toBeLessThanOrEqual(158);
    expect(cut.endsWith('…')).toBe(true);
  });
});

describe('allSeriesLabel (the Career card’s link to Shows › Series)', () => {
  it('says "All 26 series" as the board does, never "All 1 series"', () => {
    expect(allSeriesLabel(26, 'long')).toBe('All 26 series');
    expect(allSeriesLabel(26, 'short')).toBe('All 26');
    expect(allSeriesLabel(1, 'long')).toBe('1 series');
    expect(allSeriesLabel(1, 'short')).toBe('1 series');
  });
});
