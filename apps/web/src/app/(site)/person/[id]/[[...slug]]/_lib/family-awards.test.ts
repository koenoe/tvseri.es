import type { PersonAwards } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { awardCards, awardsLine } from './awards';
import { childrenLine, spouseLine } from './family';

describe('spouseLine', () => {
  it('names the latest marriage, "since" while it lasts', () => {
    expect(
      spouseLine({
        children: [],
        spouses: [
          {
            endYear: 1982,
            id: 'Q1',
            name: 'Mickey Middleton',
            startYear: 1977,
          },
          { id: 'Q2', name: 'Robin Dearden', startYear: 1989 },
        ],
      }),
    ).toEqual({ spouse: { name: 'Robin Dearden' }, years: ' since 1989' });
  });

  it('links a spouse TMDB knows', () => {
    expect(
      spouseLine({
        children: [],
        spouses: [
          {
            id: 'Q2',
            name: 'Robin Dearden',
            slug: 'robin-dearden',
            startYear: 1989,
            tmdbId: 1234,
          },
        ],
      }),
    ).toEqual({
      spouse: { href: '/person/1234/robin-dearden', name: 'Robin Dearden' },
      years: ' since 1989',
    });
  });

  it('gives an ended marriage its years', () => {
    expect(
      spouseLine({
        children: [],
        spouses: [{ endYear: 2010, id: 'Q1', name: 'A', startYear: 2001 }],
      }),
    ).toEqual({ spouse: { name: 'A' }, years: ', 2001–2010' });
    expect(
      spouseLine({
        children: [],
        spouses: [{ endYear: 2010, id: 'Q1', name: 'A' }],
      })?.years,
    ).toBe(', until 2010');
    expect(
      spouseLine({ children: [], spouses: [{ id: 'Q1', name: 'A' }] })?.years,
    ).toBe('');
    expect(spouseLine(null)).toBeUndefined();
  });
});

describe('childrenLine', () => {
  it('links a child TMDB knows', () => {
    expect(
      childrenLine({
        children: [
          {
            id: 'Q3',
            name: 'Taylor Dearden',
            relation: 'daughter',
            slug: 'taylor-dearden',
            tmdbId: 1234,
          },
        ],
        spouses: [],
      }),
    ).toEqual({
      label: 'Daughter',
      people: [{ href: '/person/1234/taylor-dearden', name: 'Taylor Dearden' }],
    });
  });

  it('says Children for mixed relations, plural for the same', () => {
    expect(
      childrenLine({
        children: [
          { id: 'Q1', name: 'A', relation: 'son' },
          { id: 'Q2', name: 'B', relation: 'son' },
        ],
        spouses: [],
      })?.label,
    ).toBe('Sons');
    expect(
      childrenLine({
        children: [
          { id: 'Q1', name: 'A', relation: 'son' },
          { id: 'Q2', name: 'B', relation: 'daughter' },
        ],
        spouses: [],
      })?.label,
    ).toBe('Children');
  });
});

const cranston: PersonAwards = {
  groups: [
    { name: 'Emmy', nominations: 9, wins: 7 },
    { name: 'SAG', nominations: 7, wins: 5 },
    { name: "Critics' Choice", nominations: 2, wins: 4 },
    { name: 'Gold Derby', nominations: 1, wins: 3 },
    { name: 'Tony', nominations: 0, wins: 2 },
    { name: 'Golden Globe', nominations: 7, wins: 1 },
    { name: 'Laurence Olivier', nominations: 1, wins: 1 },
  ],
  items: [
    {
      award:
        'Primetime Emmy Award for Outstanding Lead Actor in a Drama Series',
      group: 'Emmy',
      won: true,
      work: 'Breaking Bad',
      year: 2014,
    },
    {
      award: 'Primetime Emmy Award for Outstanding Comedy Series',
      group: 'Emmy',
      won: true,
      work: 'The Studio',
      year: 2025,
    },
    {
      award: 'Tony Award for Best Actor in a Play',
      group: 'Tony',
      won: true,
      work: 'All the Way',
    },
    {
      award: 'Tony Award for Best Actor in a Play',
      group: 'Tony',
      won: true,
      work: 'Network',
    },
    {
      award: 'Golden Globe Award for Best Actor',
      group: 'Golden Globe',
      won: true,
      work: 'Breaking Bad',
    },
  ],
  nominations: 24,
  total: 40,
  wins: 16,
};

describe('awardsLine', () => {
  it('names the headline families with wins', () => {
    expect(awardsLine(cranston)).toBe('7 Emmys, 2 Tonys, 1 Golden Globe');
  });

  it('counts nominations when nothing was won', () => {
    expect(
      awardsLine({
        groups: [{ name: 'Emmy', nominations: 1, wins: 0 }],
        items: [],
        nominations: 1,
        total: 1,
        wins: 0,
      }),
    ).toBe('1 Emmy nomination');
    expect(awardsLine(null)).toBeUndefined();
  });
});

describe('awardCards', () => {
  it('names a card by the awards it counts', () => {
    expect(awardCards(cranston).slice(0, 3)).toEqual([
      {
        count: 7,
        detail: 'Breaking Bad, The Studio',
        label: 'Primetime Emmys',
      },
      { count: 5, detail: '', label: 'Actor Awards' },
      { count: 2, detail: 'All the Way, Network', label: 'Tony Awards' },
    ]);
  });

  it('draws a lone nomination with its category and work', () => {
    expect(
      awardCards({
        groups: [{ name: 'Emmy', nominations: 1, wins: 0 }],
        items: [
          {
            award:
              "Children's and Family Emmy Award for Outstanding Supporting Performer",
            group: 'Emmy',
            won: false,
            work: 'Percy Jackson and the Olympians',
            year: 2025,
          },
        ],
        nominations: 1,
        total: 1,
        wins: 0,
      }),
    ).toEqual([
      {
        count: 1,
        detail:
          'Outstanding Supporting Performer, Percy Jackson and the Olympians',
        label: "Children's & Family Emmy nomination",
      },
    ]);
  });
});
