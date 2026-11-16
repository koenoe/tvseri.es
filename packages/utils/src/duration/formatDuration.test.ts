import { describe, expect, it } from 'vitest';

import { formatDuration, formatRuntime } from './formatDuration';

describe('formatDuration', () => {
  it('writes minutes, hours, and both', () => {
    expect(formatDuration(58)).toBe('58m');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(190)).toBe('3h 10m');
    expect(formatDuration(1352)).toBe('22h 32m');
  });

  it('shows minutes only when there are some, at the edges', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(59)).toBe('59m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(61)).toBe('1h 1m');
    expect(formatDuration(900)).toBe('15h');
    expect(formatDuration(6000)).toBe('100h');
    expect(formatDuration(6001)).toBe('100h 1m');
    expect(formatDuration(1611)).toBe('26h 51m');
  });

  it('rounds to the minute and never goes below zero', () => {
    expect(formatDuration(119.6)).toBe('2h');
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(-5)).toBe('0m');
  });
});

describe('formatRuntime', () => {
  it('writes a runtime, nothing without one', () => {
    expect(formatRuntime(58)).toBe('58m');
    expect(formatRuntime(115)).toBe('1h 55m');
    expect(formatRuntime(331)).toBe('5h 31m');
    expect(formatRuntime(240)).toBe('4h');
    expect(formatRuntime(null)).toBeNull();
    expect(formatRuntime(0)).toBeNull();
  });
});
