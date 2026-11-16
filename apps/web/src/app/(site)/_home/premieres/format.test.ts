import type { Premiere, TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  countdownChip,
  countdownDate,
  countdownFill,
  countdownSeason,
  countdownUnit,
  kindLabel,
  kindTone,
  releaseLabel,
  ticketDate,
  ticketLabel,
  ticketStub,
} from './format';

describe('ticketStub', () => {
  it('says Tonight on the day', () => {
    expect(ticketStub(0)).toEqual({ count: null, unit: 'Tonight' });
  });

  it('counts days for under two weeks', () => {
    expect(ticketStub(1)).toEqual({ count: 1, unit: 'Day' });
    expect(ticketStub(6)).toEqual({ count: 6, unit: 'Days' });
    expect(ticketStub(13)).toEqual({ count: 13, unit: 'Days' });
  });

  it('counts whole weeks from two weeks (HMFinal: 21, 34, 58 days)', () => {
    expect(ticketStub(14)).toEqual({ count: 2, unit: 'Weeks' });
    expect(ticketStub(21)).toEqual({ count: 3, unit: 'Weeks' });
    expect(ticketStub(34)).toEqual({ count: 5, unit: 'Weeks' });
    expect(ticketStub(58)).toEqual({ count: 8, unit: 'Weeks' });
  });
});

describe('ticketDate', () => {
  it('is the weekday, day and month', () => {
    expect(ticketDate('2026-11-12', 1)).toBe('Thu Nov 12');
    expect(ticketDate('2026-12-02', 21)).toBe('Wed Dec 2');
    expect(ticketDate('2027-01-08', 58)).toBe('Fri Jan 8');
  });

  it('is Tonight on the day', () => {
    expect(ticketDate('2026-11-11', 0)).toBe('Tonight');
  });
});

describe('kindLabel and kindTone', () => {
  it('names what happens on the date', () => {
    expect(kindLabel('season-premiere', 4)).toBe('Season 4 premiere');
    expect(kindLabel('new-series', 1)).toBe('New series');
    expect(kindLabel('season-finale', 2)).toBe('Season finale');
    expect(kindLabel('special', 5)).toBe('Special');
  });

  it('is cyan only for a finale', () => {
    expect(kindTone('season-finale')).toBe('cyan');
    expect(kindTone('season-premiere')).toBe('pink');
    expect(kindTone('special')).toBe('pink');
  });
});

describe('releaseLabel', () => {
  it('names the release, or nothing when unknown', () => {
    expect(releaseLabel('weekly')).toBe('Weekly');
    expect(releaseLabel('full-season')).toBe('Full season');
    expect(releaseLabel(null)).toBeNull();
  });
});

const premiere = (fields: Partial<Premiere>, network?: string): Premiere => ({
  date: '2026-11-12',
  daysAway: 1,
  isBig: false,
  kind: 'season-premiere',
  release: 'full-season',
  seasonNumber: 2,
  series: {
    network: network ? { id: 1, logo: '', name: network } : undefined,
    title: 'Dept. Q',
  } as TvSeries,
  ...fields,
});

describe('ticketLabel', () => {
  it('reads the ticket as one line', () => {
    expect(ticketLabel(premiere({}, 'Netflix'))).toBe(
      'Dept. Q, Season 2 premiere, Thu Nov 12, full season, on Netflix',
    );
  });

  it('leaves out what is unknown', () => {
    expect(
      ticketLabel(
        premiere({ date: '2026-11-11', daysAway: 0, seasonNumber: 7 }),
      ),
    ).toBe('Dept. Q, Season 7 premiere, Tonight, full season');
    expect(
      ticketLabel(
        premiere(
          { date: '2026-11-19', daysAway: 8, kind: 'special', release: null },
          'HBO Max',
        ),
      ),
    ).toBe('Dept. Q, Special, Thu Nov 19, on HBO Max');
  });
});

describe('countdown labels', () => {
  it('formats the date and unit as the board does', () => {
    expect(countdownDate('2026-11-17')).toBe('Nov 17');
    expect(countdownUnit(3)).toBe('days to go');
    expect(countdownUnit(1)).toBe('day to go');
  });

  it('names the season as the board does ("Season 4", else the kind)', () => {
    expect(countdownSeason('season-premiere', 4)).toBe('Season 4');
    expect(countdownSeason('special', 6)).toBe('Special');
    expect(countdownSeason('new-series', 1)).toBe('New series');
  });

  it('counts the chips in days', () => {
    expect(countdownChip(3)).toBe('In 3 days');
    expect(countdownChip(18)).toBe('In 18 days');
    expect(countdownChip(1)).toBe('In 1 day');
    expect(countdownChip(0)).toBe('Tonight');
  });

  it('fills the line over the last 30 days, at least 4%', () => {
    expect(countdownFill(3)).toBe(90);
    expect(countdownFill(18)).toBe(40);
    expect(countdownFill(30)).toBe(4);
    expect(countdownFill(0)).toBe(100);
  });
});
