import { describe, expect, it } from 'vitest';

import {
  defaultSince,
  formatSinceButton,
  formatSinceDay,
  sinceChoices,
  sinceLine,
} from './syncScope';

// Thu 19 Nov 2026, 15:00 local
const NOW = new Date(2026, 10, 19, 15).getTime();
const day = (year: number, month: number, date: number) =>
  new Date(year, month, date).getTime();

describe('defaultSince', () => {
  it('is the start of the day three months back', () => {
    expect(defaultSince(NOW, null)).toBe(day(2026, 7, 19));
  });

  it('after linking again, is the day the last sync reached', () => {
    expect(defaultSince(NOW, new Date(2026, 10, 2, 21, 30).getTime())).toBe(
      day(2026, 10, 2),
    );
  });
});

describe('sinceChoices', () => {
  it('offers a week, a month, three months and the year’s start', () => {
    expect(sinceChoices(NOW, null)).toEqual([
      { day: day(2026, 10, 12), key: '1w', label: '1 week ago' },
      { day: day(2026, 9, 19), key: '1m', label: '1 month ago' },
      { day: day(2026, 7, 19), key: '3m', label: '3 months ago' },
      { day: day(2026, 0, 1), key: 'year', label: 'Start of the year' },
    ]);
  });

  it('after linking again, leads with where the last sync reached', () => {
    const [first, ...rest] = sinceChoices(NOW, day(2026, 10, 2));
    expect(first).toEqual({
      day: day(2026, 10, 2),
      key: 'last',
      label: 'Last sync',
    });
    expect(rest.map((choice) => choice.key)).toEqual(['1m', '3m', 'year']);
  });
});

describe('the words', () => {
  it('writes a day out in full', () => {
    expect(formatSinceDay(day(2026, 7, 19))).toBe('August 19, 2026');
  });

  it('keeps the button short: the year only when it isn’t this one', () => {
    expect(formatSinceButton(day(2026, 7, 19), NOW)).toBe('Aug 19');
    expect(formatSinceButton(day(2025, 10, 19), NOW)).toBe('Nov 19, 2025');
  });

  it('says what each choice reads', () => {
    expect(
      sinceLine({ kind: 'since', since: day(2026, 7, 19) }, null, 2542),
    ).toBe('From August 19, 2026 to today.');
    expect(
      sinceLine(
        { kind: 'since', since: day(2026, 10, 2) },
        day(2026, 10, 2),
        2542,
      ),
    ).toBe(
      'Carries on from your last sync. Pick an earlier day to read further back.',
    );
    expect(sinceLine({ kind: 'everything' }, null, 2542)).toBe(
      'All 2,542 episodes in its history, in one go.',
    );
    expect(sinceLine({ kind: 'everything' }, null, null)).toBe(
      'Your whole history, in one go.',
    );
  });
});
