import { describe, expect, it } from 'vitest';

import {
  formatAverage,
  formatStatsRuntime,
  formatYearHours,
  percentageDelta,
} from './format';

describe('formatStatsRuntime', () => {
  it('writes weeks, days and hours, rounded to the hour', () => {
    expect(formatStatsRuntime(30_000)).toBe('2w 6d 20h');
    expect(formatStatsRuntime(46_320)).toBe('4w 4d 4h');
    expect(formatStatsRuntime(7_260)).toBe('5d 1h');
    expect(formatStatsRuntime(89)).toBe('1h');
    expect(formatStatsRuntime(0)).toBe('0h');
  });

  it('keeps the minutes when asked', () => {
    expect(formatStatsRuntime(825, true)).toBe('13h 45m');
    expect(formatStatsRuntime(0, true)).toBe('0m');
  });
});

describe('formatYearHours', () => {
  it('rounds to whole hours, never 0h for some time', () => {
    expect(formatYearHours(2160)).toBe('36h');
    expect(formatYearHours(400)).toBe('7h');
    expect(formatYearHours(20)).toBe('1h');
    expect(formatYearHours(0)).toBe('0h');
  });
});

describe('averages', () => {
  it('keeps one decimal for averages', () => {
    expect(formatAverage(1.6849)).toBe('1.7');
    expect(formatAverage(2)).toBe('2');
  });
});

describe('percentageDelta', () => {
  it('is today’s whole-percent change', () => {
    expect(percentageDelta(615, 958)).toBe(-36);
    expect(percentageDelta(71, 69)).toBe(3);
    expect(percentageDelta(5, 0)).toBe(100);
    expect(percentageDelta(0, 0)).toBe(0);
  });
});
