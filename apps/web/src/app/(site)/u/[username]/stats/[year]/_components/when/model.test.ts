import { describe, expect, it } from 'vitest';

import {
  barHeightRatio,
  bulkNote,
  daytimeText,
  hourName,
  hourRange,
  nightShareText,
  peakIndex,
  peakText,
} from './model';

const hours2025 = [
  26, 8, 3, 1, 0, 0, 0, 2, 1, 2, 3, 4, 5, 9, 13, 11, 9, 7, 15, 37, 88, 149, 134,
  64,
];
const weekdays2025 = [89, 57, 66, 73, 113, 112, 105];

describe('peakIndex', () => {
  it('finds the first highest value', () => {
    expect(peakIndex(hours2025)).toBe(21);
    expect(peakIndex(weekdays2025)).toBe(4);
    expect(peakIndex([3, 5, 5])).toBe(1);
  });

  it('has no peak without episodes', () => {
    expect(peakIndex([0, 0, 0])).toBe(-1);
    expect(peakIndex([])).toBe(-1);
  });
});

describe('hourName', () => {
  it('speaks the 12-hour clock', () => {
    expect([0, 1, 11, 12, 13, 21, 23].map(hourName)).toEqual([
      '12 am',
      '1 am',
      '11 am',
      '12 pm',
      '1 pm',
      '9 pm',
      '11 pm',
    ]);
  });
});

describe('peakText', () => {
  it('names the plural weekday and the hour', () => {
    expect(peakText(weekdays2025, hours2025)).toBe('Fridays, around 9 pm');
    const noon = Array.from({ length: 24 }, (_, hour) => (hour === 12 ? 9 : 0));
    expect(peakText([0, 0, 0, 0, 0, 0, 5], noon)).toBe('Sundays, around 12 pm');
  });

  it('has no line without episodes', () => {
    expect(peakText([0, 0, 0, 0, 0, 0, 0], Array(24).fill(0))).toBeUndefined();
  });
});

describe('nightShareText', () => {
  it('counts 20:00 to 04:59 of the counted episodes', () => {
    expect(nightShareText(hours2025)).toBe('80% after 8 pm');
  });

  it('has no line without episodes', () => {
    expect(nightShareText(Array(24).fill(0))).toBeUndefined();
  });
});

describe('daytimeText', () => {
  it('names where the daytime episodes fall', () => {
    expect(daytimeText({ weekday: 12, weekend: 30 })).toBe(
      'Daytime mostly on weekends',
    );
    expect(daytimeText({ weekday: 30, weekend: 12 })).toBe(
      'Daytime mostly on weekdays',
    );
    expect(daytimeText({ weekday: 5, weekend: 5 })).toBe(
      'Daytime mostly on weekdays',
    );
  });

  it('leaves the line out without daytime watching', () => {
    expect(daytimeText(undefined)).toBeUndefined();
    expect(daytimeText({ weekday: 0, weekend: 0 })).toBeUndefined();
  });
});

describe('tooltips', () => {
  it('names the hours', () => {
    expect(hourRange(0)).toBe('00:00 – 01:00');
    expect(hourRange(23)).toBe('23:00 – 00:00');
  });
});

describe('barHeightRatio', () => {
  it('is relative to the highest bar', () => {
    expect(barHeightRatio(149, 149)).toBe(1);
    expect(barHeightRatio(26, 149)).toBeCloseTo(0.1745, 4);
    expect(barHeightRatio(0, 0)).toBe(0);
  });
});

describe('bulkNote', () => {
  it('says what was left out, only when something was', () => {
    expect(bulkNote(24)).toBe('Leaves out 24 episodes marked watched in bulk.');
    expect(bulkNote(1)).toBe('Leaves out 1 episode marked watched in bulk.');
    expect(bulkNote(0)).toBeUndefined();
  });
});
