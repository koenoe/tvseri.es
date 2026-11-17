import type { PersonCareer, PersonCareerRow } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { besideBar, buildCareer, pickRows } from './career';

const row = (
  id: number,
  name: string,
  startYear: number,
  endYear: number,
  episodeCount: number,
  extra: Partial<PersonCareerRow> = {},
): PersonCareerRow => ({
  endYear,
  episodeCount,
  id,
  name,
  ongoing: false,
  role: 'Role',
  slug: name.toLowerCase().replaceAll(' ', '-'),
  startYear,
  weight: episodeCount > 20 ? 3 : episodeCount > 5 ? 2 : 1,
  ...extra,
});

const career: PersonCareer = {
  guest: {
    count: 3,
    firstYear: 1982,
    lastYear: 2022,
    ticks: [
      { id: 1, name: 'A', year: 1982 },
      { id: 2, name: 'B', year: 1982 },
      { id: 3, name: 'C', year: 2022 },
    ],
  },
  rows: [
    row(1400, 'Seinfeld', 1994, 1997, 7, { role: 'Tim Whatley' }),
    row(1396, 'Breaking Bad', 2008, 2013, 62, { role: 'Walter White' }),
    row(2004, 'Malcolm in the Middle', 2000, 2006, 151),
    row(9, 'Malcolm in the Middle: Life’s Still Unfair', 2026, 2026, 4),
  ],
  upcoming: [
    {
      episodeCount: 0,
      id: 77,
      name: 'Tightrope!',
      role: 'Executive Producer',
      slug: 'tightrope',
      state: 'in-development',
    },
  ],
};

describe('pickRows', () => {
  it('keeps Known for first, then the most episodes, oldest first', () => {
    const rows = [
      row(1, 'A', 2000, 2001, 100),
      row(2, 'B', 1990, 1991, 2),
      row(3, 'C', 2010, 2011, 50),
    ];
    expect(pickRows(rows, [2], 2).map((r) => r.id)).toEqual([2, 1]);
  });
});

describe('buildCareer', () => {
  const view = buildCareer(career, { today: 2026.86 });

  it('spans the first year to a year past the last bar, Today included', () => {
    // 1982 … 2028
    expect(view?.marker).toEqual({
      at: ((2026.86 - 1982) / 46) * 100,
      died: false,
      label: 'Today',
    });
    expect(view?.axis.desktop.map((tick) => tick.label)).toEqual([
      '1990',
      '2000',
      '2010',
      '2020',
    ]);
    expect(view?.axis.phone.map((tick) => tick.label)).toEqual([
      '1990',
      '2010',
    ]);
  });

  it('draws a bar from the first year to the end of the last', () => {
    const bb = view?.rows.find((r) => r.id === 1396);
    expect(bb?.bar.start).toBeCloseTo((26 / 46) * 100);
    expect(bb?.bar.end).toBeCloseTo((32 / 46) * 100);
    expect(bb?.years).toBe('2008–2013');
    expect(bb?.details).toBe(': Walter White, 62 episodes, 2008–2013');
  });

  it('shortens a spin-off next to its show', () => {
    expect(view?.rows.at(-1)?.name).toBe('Life’s Still Unfair');
  });

  it('puts announced work past Today, with its caption before it', () => {
    expect(view?.upcoming[0]).toMatchObject({
      date: 'No date yet',
      when: 'In development',
    });
    expect(view?.upcoming[0]?.bar.start).toBeCloseTo((45 / 46) * 100);
  });

  it('spreads guest roles of one year apart', () => {
    const [a, b] = view?.guest?.ticks ?? [];
    expect((b ?? 0) - (a ?? 0)).toBeCloseTo((0.3 / 46) * 100);
    expect(view?.guest?.years).toBe('1982–2022');
  });

  it('starts the guest caption at the widest gap when it fits after it', () => {
    const [, second] = view?.guest?.ticks ?? [];
    expect(view?.guest?.caption).toEqual({ left: second, side: 'after' });
  });

  it('keeps the guest caption inside the track when the widest gap is at its end', () => {
    const late = buildCareer(
      {
        ...career,
        guest: {
          count: 2,
          firstYear: 2018,
          lastYear: 2019,
          ticks: [
            { id: 1, name: 'A', year: 2018 },
            { id: 2, name: 'B', year: 2019 },
          ],
        },
      },
      { today: 2026.86 },
    );
    expect(late?.guest?.caption).toEqual({ right: 0, side: 'before' });
  });

  it('marks the date of death instead of Today, with no upcoming row', () => {
    const died = buildCareer(career, {
      deathdate: '2023-03-17',
      deathYear: 2023.21,
      today: 2026.86,
    });
    expect(died?.marker.label).toBe('Died Mar 17, 2023');
    expect(died?.upcoming).toEqual([]);
  });

  it('has no chart without rows or guest roles', () => {
    expect(
      buildCareer(
        { guest: { count: 0, ticks: [] }, rows: [], upcoming: [] },
        { today: 2026 },
      ),
    ).toBeNull();
  });
});

describe('besideBar', () => {
  it('goes after the bar when it fits, else before', () => {
    expect(besideBar({ end: 50, start: 40 }, 100, 620)).toEqual({
      left: 50,
      side: 'after',
    });
    expect(besideBar({ end: 90, start: 80 }, 100, 620)).toEqual({
      right: 20,
      side: 'before',
    });
  });

  it('sits on a bar that leaves no room on either side', () => {
    expect(besideBar({ end: 98, start: 2 }, 100, 620)).toEqual({
      side: 'over',
    });
  });
});

describe('runs', () => {
  it('breaks a bar where a year has no episodes', () => {
    const view = buildCareer(
      {
        guest: { count: 0, ticks: [] },
        rows: [
          row(1, 'Sneaky Pete', 2015, 2017, 10, { years: [2015, 2017] }),
          row(2, 'Your Honor', 2020, 2023, 20, { years: [2020, 2021, 2023] }),
        ],
        upcoming: [],
      },
      { today: 2026.86 },
    );
    expect(view?.rows[0]?.runs).toHaveLength(2);
    expect(view?.rows[1]?.runs).toHaveLength(2);
  });

  it('keeps work released after death and never crosses the death line', () => {
    const view = buildCareer(
      {
        guest: { count: 0, ticks: [] },
        rows: [
          ...Array.from({ length: 9 }, (_, index) =>
            row(100 + index, `Big ${index}`, 2000 + index, 2002 + index, 50),
          ),
          row(7, 'Last', 2022, 2023, 60),
          row(8, 'Posthumous', 2024, 2024, 1),
        ],
        upcoming: [],
      },
      { deathdate: '2023-03-17', deathYear: 2023.21, today: 2026.86 },
    );
    const names = view?.rows.map((r) => r.name) ?? [];
    expect(names).toContain('Posthumous');
    const last = view?.rows.find((r) => r.name === 'Last');
    expect(last?.runs.at(-1)?.end).toBeCloseTo(view?.marker.at ?? 0);
  });
});
