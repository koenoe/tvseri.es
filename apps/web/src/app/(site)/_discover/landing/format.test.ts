import { describe, expect, it } from 'vitest';

import {
  formatCount,
  formatPercent,
  formatSeasons,
  formatShows,
  keywordLabel,
  keywordTitle,
} from './format';
import { rankedPage, showMoreLabel } from './ranked';

describe('landing numbers', () => {
  it('groups counts and writes whole percentages (the genre facts)', () => {
    expect(formatCount(10_927)).toBe('10,927');
    expect(formatCount(3180)).toBe('3,180');
    expect(formatCount(146)).toBe('146');
    expect(formatPercent(71)).toBe('71%');
    expect(formatShows(146)).toBe('146 series');
    expect(formatShows(1)).toBe('1 series');
    expect(formatShows(20001)).toBe('20,000+ series');
  });

  it('says seasons, or episodes for a one-season show', () => {
    expect(formatSeasons(7, 33)).toBe('7 seasons');
    expect(formatSeasons(1, 9)).toBe('9 episodes');
    expect(formatSeasons(1, 1)).toBe('1 episode');
    expect(formatSeasons(1, 0)).toBeNull();
  });

  it('title-cases a TMDB keyword as the design does', () => {
    expect(keywordTitle('dystopia')).toBe('Dystopia');
    expect(keywordTitle('post-apocalyptic future')).toBe(
      'Post-apocalyptic future',
    );
  });

  it('changes only the first letter, so capitals inside stay', () => {
    expect(keywordTitle(' new York ')).toBe('New York');
    expect(keywordTitle('BBC')).toBe('BBC');
  });
});

describe('ranked list paging', () => {
  const fifty = Array.from({ length: 50 }, (_, index) => `show ${index + 1}`);

  it('pages 10 at a time with ranks and a range', () => {
    const first = rankedPage(fifty, 0, 10);
    expect(first.range).toBe('1–10 of 50');
    expect(first.atStart).toBe(true);
    expect(first.atEnd).toBe(false);
    expect(first.items[0]).toEqual({ item: 'show 1', rank: 1 });
    const last = rankedPage(fifty, 4, 10);
    expect(last.range).toBe('41–50 of 50');
    expect(last.atEnd).toBe(true);
    expect(last.items.at(-1)).toEqual({ item: 'show 50', rank: 50 });
  });

  it('clamps the page and handles a short list', () => {
    expect(rankedPage(fifty, 9, 10).range).toBe('41–50 of 50');
    expect(rankedPage(fifty, -1, 10).range).toBe('1–10 of 50');
    const short = rankedPage(fifty.slice(0, 23), 2, 10);
    expect(short.range).toBe('21–23 of 23');
    expect(short.atEnd).toBe(true);
    expect(rankedPage([], 0, 10).range).toBe('0 of 0');
  });

  it("labels the phone's next step and ends at the last show", () => {
    expect(showMoreLabel(5, 50, 5)).toBe('Show 6 to 10 of 50');
    expect(showMoreLabel(45, 50, 5)).toBe('Show 46 to 50 of 50');
    expect(showMoreLabel(20, 23, 5)).toBe('Show 21 to 23 of 23');
    expect(showMoreLabel(50, 50, 5)).toBeNull();
  });
});

describe('keywordLabel (the design’s wording for a few TMDB keywords)', () => {
  it('writes the labels the design words differently', () => {
    expect(keywordLabel('organized crime')).toBe('Organised crime');
    expect(keywordLabel('Organized crime')).toBe('Organised crime');
  });

  it('sentence-cases every other keyword', () => {
    expect(keywordLabel('post-apocalyptic future')).toBe(
      'Post-apocalyptic future',
    );
    expect(keywordLabel('alternate history')).toBe('Alternate history');
  });
});
