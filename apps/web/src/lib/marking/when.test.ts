import { describe, expect, it } from 'vitest';

import { lastWeekend, toMarkWhen, whenLabel } from './when';

// Local time: these tests run in the machine's zone, as the browser does.
const at = (y: number, m: number, d: number, h = 21, min = 40) =>
  new Date(y, m - 1, d, h, min).getTime();

describe('lastWeekend', () => {
  it('is the Saturday of the weekend that is over', () => {
    // Thu 12 Nov 2026 → Sat 7 Nov (the board's demo)
    expect(lastWeekend(at(2026, 11, 12))).toEqual(new Date(2026, 10, 7));
    // Sun 15 Nov: this weekend isn't over yet → Sat 7 Nov
    expect(lastWeekend(at(2026, 11, 15))).toEqual(new Date(2026, 10, 7));
    // Mon 16 Nov → Sat 14 Nov
    expect(lastWeekend(at(2026, 11, 16))).toEqual(new Date(2026, 10, 14));
  });
});

describe('toMarkWhen', () => {
  const now = at(2026, 11, 12);

  it('Yesterday is the same time a day earlier', () => {
    expect(toMarkWhen({ kind: 'yesterday' }, now)).toEqual({
      kind: 'date',
      watchedAt: at(2026, 11, 11),
    });
  });

  it('a picked day and Last weekend are 21:00 that day, never in the future', () => {
    expect(toMarkWhen({ kind: 'weekend' }, now)).toEqual({
      kind: 'date',
      watchedAt: at(2026, 11, 7, 21, 0),
    });
    const morning = at(2026, 11, 12, 9, 0);
    expect(
      toMarkWhen({ day: new Date(2026, 10, 12), kind: 'day' }, morning),
    ).toEqual({ kind: 'date', watchedAt: morning });
  });

  it('release dates carry the browser’s offset', () => {
    expect(toMarkWhen({ kind: 'release' }, now)).toEqual({
      kind: 'release',
      tzOffsetMinutes: new Date(now).getTimezoneOffset(),
    });
  });
});

describe('labels', () => {
  const now = at(2026, 11, 12);

  it('names every choice', () => {
    expect(whenLabel({ kind: 'now' }, now)).toBe('Just now');
    expect(whenLabel({ kind: 'unknown' }, now)).toBe('I don’t remember when');
    expect(whenLabel({ day: new Date(2026, 10, 3), kind: 'day' }, now)).toBe(
      'Nov 3',
    );
  });
});
