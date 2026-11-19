import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { barHeight, dayName, weekOf } from './scrobbleWeek';

const at = (iso: string) => Date.parse(iso);

/** The runtime's own zone is the viewer's: tests pick one per case */
const inZone = (timeZone: string) => {
  process.env.TZ = timeZone;
};
const zone = process.env.TZ;
beforeEach(() => inZone('UTC'));
afterEach(() => {
  if (zone === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = zone;
  }
});

describe('weekOf', () => {
  it('is the seven days ending today, oldest first, with their letters', () => {
    // Sunday 15 Nov 2026
    const week = weekOf([], '2026-11-15');
    expect(week.map((day) => day.key)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);
    expect(week.map((day) => day.letter).join('')).toBe('MTWTFSS');
    expect(week.map((day) => day.isToday)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(week[4]?.label).toBe('Fri Nov 13');
  });

  it('an empty week is seven days with nothing', () => {
    const week = weekOf([], '2026-11-15');
    expect(week).toHaveLength(7);
    expect(week.every((day) => day.count === 0)).toBe(true);
  });

  it("counts each mark on the viewer's own calendar day", () => {
    const marks = [
      // 23:30 in London on Friday, already Saturday in Tokyo
      { watchedAt: at('2026-11-13T23:30:00Z') },
      { watchedAt: at('2026-11-13T10:00:00Z') },
      // older than the week: not counted
      { watchedAt: at('2026-11-01T10:00:00Z') },
    ];
    inZone('Europe/London');
    const london = weekOf(marks, '2026-11-15');
    expect(london.find((day) => day.key === '2026-11-13')?.count).toBe(2);
    inZone('Asia/Tokyo');
    const tokyo = weekOf(marks, '2026-11-15');
    expect(tokyo.find((day) => day.key === '2026-11-13')?.count).toBe(1);
    expect(tokyo.find((day) => day.key === '2026-11-14')?.count).toBe(1);
  });

  it('a day starts at local midnight, not UTC midnight', () => {
    // 23:59 in New York on 14 Nov is 04:59 UTC on the 15th
    inZone('America/New_York');
    const week = weekOf(
      [{ watchedAt: at('2026-11-15T04:59:00Z') }],
      '2026-11-15',
    );
    expect(week[6]?.count).toBe(0);
    expect(week[5]?.count).toBe(1);
  });

  it('moves a day on at local midnight: the week shifts, today is the new day', () => {
    inZone('Europe/London');
    const marks = [{ watchedAt: at('2026-11-15T21:00:00Z') }];
    const before = weekOf(marks, '2026-11-15');
    const after = weekOf(marks, '2026-11-16');
    expect(before[6]?.key).toBe('2026-11-15');
    expect(before[6]?.count).toBe(1);
    expect(after[6]?.key).toBe('2026-11-16');
    expect(after[6]?.count).toBe(0);
    expect(after[5]?.key).toBe('2026-11-15');
    expect(after[5]?.count).toBe(1);
    expect(after[0]?.key).toBe('2026-11-10');
  });

  it('a week with a clock change still has seven distinct days', () => {
    // London leaves summer time on Sunday 25 Oct 2026 (a 25-hour day)
    inZone('Europe/London');
    const week = weekOf(
      [
        { watchedAt: at('2026-10-24T23:30:00Z') }, // 00:30 BST on Sun 25
        { watchedAt: at('2026-10-25T23:30:00Z') }, // 23:30 GMT on Sun 25
      ],
      '2026-10-27',
    );
    expect(new Set(week.map((day) => day.key)).size).toBe(7);
    expect(week[0]?.key).toBe('2026-10-21');
    expect(week[6]?.key).toBe('2026-10-27');
    expect(week.find((day) => day.key === '2026-10-25')?.count).toBe(2);
  });
});

describe('barHeight', () => {
  it('scales to the busiest day', () => {
    expect(barHeight(4, 4, 56)).toBe(56);
    expect(barHeight(2, 4, 56)).toBe(28);
  });

  it('keeps a visible bar for one episode beside a 20-episode binge', () => {
    expect(barHeight(1, 20, 56)).toBe(8);
    expect(barHeight(1, 20, 40)).toBe(8);
    expect(barHeight(20, 20, 40)).toBe(40);
  });

  it('a day without marks is a 3px stub, also in an empty week', () => {
    expect(barHeight(0, 5, 56)).toBe(3);
    expect(barHeight(0, 0, 56)).toBe(3);
  });
});

describe('dayName', () => {
  it('names the day and its count', () => {
    const day = {
      count: 3,
      isToday: false,
      key: '2026-11-13',
      label: 'Fri Nov 13',
      letter: 'F',
    };
    expect(dayName(day)).toBe('Fri Nov 13: 3 episodes');
    expect(dayName({ ...day, count: 1 })).toBe('Fri Nov 13: 1 episode');
    expect(dayName({ ...day, count: 0 })).toBe('Fri Nov 13: no episodes');
  });
});
