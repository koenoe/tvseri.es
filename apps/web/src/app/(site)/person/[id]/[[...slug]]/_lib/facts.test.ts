import { describe, expect, it } from 'vitest';

import { lifeFacts, occupationLabel, placeLabel } from './facts';

describe('placeLabel', () => {
  it('keeps the first two parts of the place of birth', () => {
    expect(placeLabel('Hollywood, Los Angeles, California, USA')).toBe(
      'Hollywood, Los Angeles',
    );
    expect(placeLabel('Baltimore, Maryland, USA')).toBe('Baltimore, Maryland');
    expect(placeLabel('London')).toBe('London');
    expect(placeLabel('')).toBeUndefined();
  });
});

describe('lifeFacts', () => {
  it('draws a living person as born, age and place', () => {
    expect(
      lifeFacts({
        age: 70,
        birthdate: '1956-03-07',
        placeOfBirth: 'Hollywood, Los Angeles, California, USA',
      }),
    ).toEqual({
      facts: [
        { icon: 'calendar', text: 'Born Mar 7, 1956 (age 70)' },
        { icon: 'pin', text: 'Hollywood, Los Angeles' },
      ],
    });
  });

  it('draws a person who died with the years, the death and the birth', () => {
    expect(
      lifeFacts({
        age: 60,
        birthdate: '1962-06-07',
        deathdate: '2023-03-17',
        placeOfBirth: 'Baltimore, Maryland, USA',
      }),
    ).toEqual({
      facts: [
        { icon: 'calendar', text: 'Died Mar 17, 2023, aged 60' },
        { icon: 'pin', text: 'Born Jun 7, 1962, Baltimore, Maryland' },
      ],
      years: '1962 – 2023',
    });
  });

  it('leaves out what TMDB does not know', () => {
    expect(lifeFacts({})).toEqual({ facts: [] });
    expect(lifeFacts({ deathdate: '2001-01-02' })).toEqual({
      facts: [{ icon: 'calendar', text: 'Died Jan 2, 2001' }],
    });
  });
});

describe('occupationLabel', () => {
  it("puts acting first, then crew work in the board's order", () => {
    expect(
      occupationLabel([
        { isCast: true, jobs: ['Director', 'Executive Producer'] },
        { isCast: true, jobs: ['Director'] },
        { isCast: false, jobs: ['Producer', 'Writer'] },
        { isCast: true, jobs: [] },
      ]),
    ).toBe('Actor, director, producer');
  });

  it('names each kind of work once', () => {
    expect(
      occupationLabel([
        { isCast: false, jobs: ['Producer', 'Executive Producer'] },
        { isCast: false, jobs: ['Writer'] },
        { isCast: false, jobs: ['Teleplay'] },
      ]),
    ).toBe('Producer, writer');
  });

  it('falls back on the TMDB department', () => {
    expect(occupationLabel([], 'Acting')).toBe('Actor');
    expect(occupationLabel([], 'Sound')).toBe('Sound');
    expect(occupationLabel([])).toBeUndefined();
  });
});

describe('year-only dates', () => {
  it('keeps "Born" with the year when TMDB has only the year', () => {
    expect(lifeFacts({ birthdate: '1956' }).facts).toEqual([
      { icon: 'calendar', text: 'Born 1956' },
    ]);
    expect(
      lifeFacts({ birthdate: '1962', deathdate: '2023-03-17' }).facts,
    ).toEqual([
      { icon: 'calendar', text: 'Died Mar 17, 2023' },
      { icon: 'pin', text: 'Born 1962' },
    ]);
  });
});
