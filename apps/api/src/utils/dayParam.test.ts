import * as v from 'valibot';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DayQuerySchema, WeekQuerySchema } from './dayParam';

const accepts = (date: string) => v.safeParse(DayQuerySchema, { date }).success;

describe('DayQuerySchema', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['just after 00:00 UTC', '2026-11-12T00:00:01Z'],
    ['midday', '2026-11-12T12:00:00Z'],
    ['just before 24:00 UTC', '2026-11-12T23:59:59Z'],
  ])('accepts exactly yesterday, today and tomorrow %s', (_name, now) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(now));

    expect(accepts('2026-11-10')).toBe(false);
    expect(accepts('2026-11-11')).toBe(true);
    expect(accepts('2026-11-12')).toBe(true);
    expect(accepts('2026-11-13')).toBe(true);
    expect(accepts('2026-11-14')).toBe(false);
  });

  it('crosses a month and a year end', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-31T23:59:59Z'));

    expect(accepts('2026-12-30')).toBe(true);
    expect(accepts('2027-01-01')).toBe(true);
    expect(accepts('2027-01-02')).toBe(false);
  });

  it('rejects things that are not dates', () => {
    expect(accepts('tomorrow')).toBe(false);
    expect(accepts('2026-13-01')).toBe(false);
    expect(accepts('')).toBe(false);
  });
});

describe('WeekQuerySchema', () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  const acceptsWeek = (week: string) =>
    v.safeParse(WeekQuerySchema, { week }).success;

  it('accepts only the weeks of yesterday, today and tomorrow', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // Monday: yesterday is last week's Sunday
    vi.setSystemTime(new Date('2026-11-16T08:00:00Z'));
    expect(acceptsWeek('2026-W45')).toBe(false);
    expect(acceptsWeek('2026-W46')).toBe(true);
    expect(acceptsWeek('2026-W47')).toBe(true);
    expect(acceptsWeek('2026-W48')).toBe(false);
  });

  it('rejects things that are not weeks', () => {
    expect(acceptsWeek('2026-46')).toBe(false);
    expect(acceptsWeek('next')).toBe(false);
  });
});
