import type { CalendarShow, WaitingForItem } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  buildCalendar,
  type CalendarData,
  calendarCounts,
  datedMonths,
  dayLabel,
  monthSummary,
  pickDay,
  todayName,
} from './calendarModel';

const show = (seriesId: number, title: string): CalendarShow => ({
  onWatchlist: false,
  posterImage: `/p/${seriesId}.jpg`,
  provider: null,
  seriesId,
  slug: title.toLowerCase().replace(/ /g, '-'),
  title,
});

const episode = (number: number) => ({
  code: `S01E0${number}`,
  episode: number,
});

/** As the API answers: Thu Nov 19, 2026; premieres lead a day, then finales */
const DATA: CalendarData = {
  days: [
    {
      date: '2026-11-20',
      daysToGo: 1,
      tickets: [
        {
          episodes: [episode(3)],
          kind: 'episode',
          release: 'weekly',
          season: 4,
          seriesId: 1,
        },
      ],
    },
    {
      date: '2026-11-25',
      daysToGo: 6,
      tickets: [
        {
          episodes: [episode(4), episode(5)],
          kind: 'episode',
          release: 'weekly',
          season: 4,
          seriesId: 1,
        },
      ],
    },
    {
      date: '2026-12-04',
      daysToGo: 15,
      tickets: [
        {
          episodes: [episode(1)],
          kind: 'season-premiere',
          release: 'weekly',
          season: 3,
          seriesId: 2,
        },
        {
          episodes: [episode(1)],
          kind: 'season-premiere',
          release: 'weekly',
          season: 6,
          seriesId: 3,
        },
        {
          episodes: [episode(5), episode(6)],
          kind: 'episode',
          release: 'weekly',
          season: 4,
          seriesId: 1,
        },
      ],
    },
    {
      date: '2026-12-15',
      daysToGo: 26,
      tickets: [
        {
          episodes: [1, 2, 3, 4, 5, 6].map(episode),
          kind: 'season-premiere',
          release: 'full-season',
          season: 2,
          seriesId: 4,
        },
      ],
    },
  ],
  from: '2026-11-01',
  shows: [
    show(1, 'The Gilded Age'),
    show(2, 'Silo'),
    show(3, 'Slow Horses'),
    show(4, 'Shōgun'),
  ],
  to: '2027-10-31',
  today: '2026-11-19',
};

describe('the calendar grid', () => {
  const calendar = buildCalendar(DATA);

  it('puts the lead show on top of a busy day, the next two behind it, and counts every episode', () => {
    const day = calendar.days.get('2026-12-04');
    expect(day?.lead.title).toBe('Silo');
    expect(day?.mark).toBe('premiere');
    expect(day?.behind).toEqual(['/p/3.jpg', '/p/1.jpg']);
    expect(day?.episodes).toBe(4);
  });

  it('stacks nothing behind one show, however many of its episodes air: ×N says it', () => {
    const binge = calendar.days.get('2026-12-15');
    expect(binge?.behind).toEqual([]);
    expect(binge?.episodes).toBe(6);
    const double = calendar.days.get('2026-11-25');
    expect(double?.behind).toEqual([]);
    expect(double?.episodes).toBe(2);
  });

  it('gives each show of a day one mark, in the API order: its premiere, finale or a plain episode', () => {
    expect(calendar.days.get('2026-12-04')?.marks).toEqual([
      'premiere',
      'premiere',
      null,
    ]);
    expect(calendar.days.get('2026-12-15')?.marks).toEqual(['premiere']);
    expect(calendar.days.get('2026-11-25')?.marks).toEqual([null]);
  });

  it('opens a day of the next month there, once the grid has slid over', () => {
    expect(pickDay(calendar, '2026-11', '2026-12-04')).toEqual({
      day: '2026-12-04',
      month: '2026-12',
      slide: true,
    });
    expect(pickDay(calendar, '2026-11', '2026-11-20')).toEqual({
      day: '2026-11-20',
      month: '2026-11',
      slide: false,
    });
  });

  it('leaves a day with nothing on it closed', () => {
    expect(pickDay(calendar, '2026-11', '2026-11-21')).toBeNull();
  });
});

describe('the calendar in words', () => {
  const calendar = buildCalendar(DATA);

  it('names a day, with what airs', () => {
    expect(dayLabel(calendar, '2026-11-20', null)).toBe(
      'Friday November 20, 1 show: The Gilded Age',
    );
    expect(dayLabel(calendar, '2026-11-21', null)).toBe(
      'Saturday November 21, nothing airs',
    );
    expect(dayLabel(calendar, '2026-12-15', '2026-12')).toBe(
      'Tuesday December 15, 1 show · 6 episodes · 1 premiere: Shōgun (opens December)',
    );
  });

  it('names Today by its date', () => {
    expect(todayName(calendar)).toBe('Today, Thursday November 19');
  });
});

const renewed = (seriesId: number): WaitingForItem => ({
  nextSeason: 2,
  posterImage: '',
  seriesId,
  slug: `show-${seriesId}`,
  state: 'renewed',
  title: `Show ${seriesId}`,
});

describe('the calendar in numbers', () => {
  const noDateYet = {
    listed: [renewed(10)],
    renewed: [renewed(11), renewed(12)],
  };
  const none = { listed: [], renewed: [] };

  it('counts the shows still to come this month and every show with no date yet', () => {
    expect(calendarCounts(DATA, noDateYet)).toEqual({
      noDate: 3,
      nothing: false,
      showsThisMonth: 1,
    });
  });

  it('leaves this month’s days that have gone out of its counts', () => {
    const december = { ...DATA, today: '2026-12-05' };
    expect(calendarCounts(december, none).showsThisMonth).toBe(1);
    expect(monthSummary(december, '2026-12')).toBe(
      '6 episodes still to come this month · 1 show · 1 premiere',
    );
    expect(monthSummary(DATA, '2026-12')).toBe(
      '10 episodes this month · 4 shows · 3 premieres',
    );
  });

  it('is nothing at all only with no dates and nothing waiting', () => {
    const empty = { ...DATA, days: [], shows: [] };
    expect(calendarCounts(empty, none).nothing).toBe(true);
    expect(calendarCounts(empty, noDateYet).nothing).toBe(false);
    expect(calendarCounts(DATA, none).nothing).toBe(false);
  });

  it('lists the months with something still to come, and their shows', () => {
    expect(datedMonths(DATA)).toEqual([
      { month: '2026-11', shows: 1 },
      { month: '2026-12', shows: 4 },
    ]);
  });
});
