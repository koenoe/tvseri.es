import { describe, expect, it } from 'vitest';

import { byExpectedReturn } from './expectedReturn';

const NOW = Date.parse('2026-11-19T12:00:00Z');

describe('byExpectedReturn', () => {
  it('orders renewed shows by when their own rhythm says they are back', () => {
    const shows = [
      // One aired season: no rhythm, so the tail, most recently finished first
      { airDates: ['2025-03-01'], finishedAt: 200, id: 'one-season' },
      // A listed but undated season doesn't make a rhythm
      { airDates: ['2025-05-01', ''], finishedAt: 300, id: 'undated-next' },
      // Yearly from March 2022: due March 2025, long overdue
      {
        airDates: ['2022-03-01', '2023-03-01', '2024-03-01'],
        id: 'long-overdue',
      },
      // Yearly: due late October 2026, last month
      {
        airDates: ['2023-11-05', '2024-11-10', '2025-11-01'],
        id: 'last-month',
      },
      // Due this month (tomorrow): counts as due now, so first
      { airDates: ['2024-11-20', '2025-11-20'], id: 'this-month' },
      // One five-year break: the median gap stays a year, due Jan 2026
      {
        airDates: ['2018-01-01', '2019-01-01', '2020-01-01', '2025-01-01'],
        id: 'one-long-break',
      },
      // A listed season that hasn't aired yet isn't the last season
      {
        airDates: ['2025-02-10', '2026-02-10', '2027-03-01'],
        id: 'february',
      },
      // Both due in March 2027: the favourite first, though it's later
      { airDates: ['2025-03-01', '2026-03-01'], id: 'march' },
      {
        airDates: ['2025-03-20', '2026-03-20'],
        favourite: true,
        id: 'march-favourite',
      },
    ].map(({ airDates, favourite = false, finishedAt, id }) => ({
      favourite,
      finishedAt,
      id,
      seasons: airDates.map((airDate) => ({ airDate })),
    }));

    expect(byExpectedReturn(shows, NOW).map((show) => show.id)).toEqual([
      'this-month',
      'last-month',
      'one-long-break',
      'long-overdue',
      'february',
      'march-favourite',
      'march',
      'undated-next',
      'one-season',
    ]);
  });
});
