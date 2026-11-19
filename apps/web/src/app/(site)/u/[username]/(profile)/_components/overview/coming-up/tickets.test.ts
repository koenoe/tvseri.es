import type { ComingUpItem } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { countdown, monthsBetween, nothingAhead, ticketText } from './tickets';

const item = (over: Partial<ComingUpItem>): ComingUpItem => ({
  date: '2026-11-11',
  daysToGo: 2,
  episode: 1,
  kind: 'season-premiere',
  onWatchlist: false,
  posterImage: '',
  provider: null,
  release: 'weekly',
  season: 3,
  seriesId: 1,
  slug: 'x',
  title: 'X',
  ...over,
});

describe('countdown', () => {
  it('counts days under two weeks, weeks after', () => {
    expect(countdown(2)).toEqual({ n: '2', unit: 'Days' });
    expect(countdown(1)).toEqual({ n: '1', unit: 'Day' });
    expect(countdown(13)).toEqual({ n: '13', unit: 'Days' });
    expect(countdown(20)).toEqual({ n: '3', unit: 'Weeks' });
    expect(countdown(30)).toEqual({ n: '4', unit: 'Weeks' });
    expect(countdown(0)).toEqual({ n: '', unit: 'Today' });
    expect(countdown(120)).toEqual({ n: '4', unit: 'Months' });
    expect(countdown(-2)).toEqual({ n: '', unit: 'Aired' });
  });
});

describe('ticketText', () => {
  it('premieres name the season and how it airs', () => {
    expect(ticketText(item({}))).toEqual({
      badge: null,
      kind: 'premiere',
      label: 'Season 3 premiere',
      note: 'Weekly',
    });
    expect(ticketText(item({ release: 'full-season' })).note).toBe(
      'Full season',
    );
  });

  it('a returning show says how long it was away', () => {
    expect(
      ticketText(item({ release: null }), { backAfterMonths: 9 }).note,
    ).toBe('Back after 9 months');
  });

  it('finales and episodes carry the code', () => {
    expect(
      ticketText(
        item({ episode: 5, kind: 'season-finale', release: null, season: 4 }),
      ),
    ).toEqual({
      badge: 'S04E05',
      kind: 'finale',
      label: 'Season finale',
      note: null,
    });
    expect(
      ticketText(item({ episode: 3, kind: 'episode', season: 2 })),
    ).toEqual({
      badge: 'S02E03',
      kind: 'episode',
      label: null,
      note: 'Weekly',
    });
  });

  it('a calendar ticket says how many of its episodes air that day', () => {
    expect(
      ticketText(item({ release: 'full-season' }), { episodes: 6 }).note,
    ).toBe('Full season · all 6');
    expect(
      ticketText(item({ kind: 'episode' }), { code: 'S02E43', episodes: 2 }),
    ).toMatchObject({ badge: 'S02E43', note: '2 episodes' });
  });

  it('measures the wait in months', () => {
    expect(monthsBetween(Date.UTC(2026, 3, 16), '2027-01-07')).toBe(9);
  });
});

describe('nothingAhead', () => {
  const waiting = {
    items: [
      {
        nextSeason: 2,
        posterImage: '',
        seriesId: 9,
        slug: 'y',
        state: 'renewed' as const,
        title: 'Y',
      },
    ],
  };
  const none = { items: [] };

  it('is nothing ahead only with no ticket, no later date and no show waiting', () => {
    expect(nothingAhead({ comingUp: [], datedLater: false }, none)).toBe(true);
  });

  it('is something ahead when only a date past the 30 days is on the calendar', () => {
    expect(nothingAhead({ comingUp: [], datedLater: true }, none)).toBe(false);
  });

  it('is something ahead with a ticket or a show waiting for a date', () => {
    expect(
      nothingAhead({ comingUp: [item({})], datedLater: false }, none),
    ).toBe(false);
    expect(nothingAhead({ comingUp: [], datedLater: false }, waiting)).toBe(
      false,
    );
  });
});
