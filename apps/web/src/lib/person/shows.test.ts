import type { PersonShow, PersonShows } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { buildShows, crewWork, inFilter } from './shows';

const show = (
  id: number,
  name: string,
  extra: Partial<PersonShow> = {},
): PersonShow => ({
  characters: [],
  episodeCount: 0,
  id,
  isCast: false,
  isCrew: false,
  isGuest: false,
  isVoice: false,
  jobs: [],
  name,
  posterImage: '',
  role: '',
  slug: name.toLowerCase().replaceAll(' ', '-'),
  ...extra,
});

const shows: PersonShows = {
  counts: {
    acting: 3,
    all: 5,
    behindTheCamera: 2,
    guest: 1,
    self: 1,
    upcoming: 1,
    voice: 1,
  },
  self: [show(50, 'Talk Show', { characters: ['Self'], isCast: true })],
  shows: [
    show(1396, 'Breaking Bad', {
      characters: ['Walter White'],
      episodeCount: 62,
      isCast: true,
      isCrew: true,
      jobs: ['Director'],
      role: 'Walter White',
      year: 2008,
    }),
    show(1421, 'Modern Family', {
      isCrew: true,
      jobs: ['Director', 'Executive Producer'],
      role: 'Director, Executive Producer',
      year: 2012,
    }),
    show(456, 'The Simpsons', {
      characters: ['Lawyer (voice)'],
      episodeCount: 1,
      isCast: true,
      isGuest: true,
      isVoice: true,
      role: 'Lawyer (voice)',
      year: 2012,
    }),
    show(1, 'Cover Up', { episodeCount: 1, isCast: true, isGuest: true }),
  ],
  upcoming: [
    show(77, 'Tightrope!', {
      isCrew: true,
      jobs: ['Executive Producer'],
      role: 'Executive Producer',
      upcoming: { state: 'in-development' },
    }),
  ],
};

describe('buildShows', () => {
  const view = buildShows(
    shows,
    [
      {
        endYear: 2013,
        episodeCount: 62,
        id: 1396,
        name: 'Breaking Bad',
        ongoing: false,
        role: 'Walter White',
        slug: 'breaking-bad',
        startYear: 2008,
        weight: 3,
      },
    ],
    'male',
  );

  it('counts the pills over the past shows only (announced work is its own group)', () => {
    expect(view.counts).toEqual({ all: 4, crew: 2, guest: 2, series: 1 });
  });

  it('draws a cast row with its career years and episodes', () => {
    expect(view.shows[0]).toMatchObject({
      crew: 'Director',
      episodes: '62 episodes',
      href: '/1396/breaking-bad',
      role: 'Walter White',
      years: '2008–2013',
    });
  });

  it('draws a crew-only row with its work and no episodes', () => {
    expect(view.shows[1]).toMatchObject({
      crew: 'Director, executive producer',
      crewOnly: true,
      episodes: null,
    });
  });

  it('marks voice roles and unlisted ones', () => {
    expect(view.shows[2]?.voice).toBe(true);
    expect(view.shows[3]?.role).toBe('Role not listed');
  });

  it('dates upcoming work by its state', () => {
    expect(view.upcoming[0]).toMatchObject({
      when: 'In development',
      years: 'No date yet',
    });
  });

  it('names the self fold by gender', () => {
    expect(view.selfLabel).toBe('As himself');
    expect(view.self).toHaveLength(1);
  });

  it('filters', () => {
    const row = view.shows[1];
    expect(row && inFilter(row, 'crew')).toBe(true);
    expect(row && inFilter(row, 'series')).toBe(false);
  });
});

describe('the self fold label', () => {
  it.each([
    ['male', 'As himself'],
    ['female', 'As herself'],
    ['non-binary', 'As themselves'],
    [undefined, 'As themselves'],
  ] as const)('says %s as "%s"', (gender, label) => {
    expect(buildShows(shows, [], gender).selfLabel).toBe(label);
  });
});

describe('the order', () => {
  it('puts the newest last year first', () => {
    const view = buildShows(
      {
        ...shows,
        shows: [
          show(1, 'Recent Guest', { isCast: true, isGuest: true, year: 2022 }),
          show(2, 'Long Runner', { isCast: true, year: 2006 }),
          show(3, 'Ended', { isCast: true, year: 2020 }),
        ],
      },
      [
        {
          endYear: 2023,
          episodeCount: 20,
          id: 3,
          name: 'Ended',
          ongoing: false,
          role: '',
          slug: 'ended',
          startYear: 2020,
          weight: 2,
        },
        {
          endYear: 2020,
          episodeCount: 9,
          id: 2,
          name: 'Long Runner',
          ongoing: false,
          role: '',
          slug: 'long-runner',
          startYear: 2006,
          weight: 2,
        },
      ],
    );
    expect(view.shows.map((row) => row.name)).toEqual([
      'Ended',
      'Recent Guest',
      'Long Runner',
    ]);
  });
});

describe('crewWork', () => {
  it('writes the work as sentences', () => {
    expect(crewWork([{ episodeCount: 2, job: 'Director' }], ['Director'])).toBe(
      'Directed 2 episodes',
    );
    expect(
      crewWork(
        [
          { episodeCount: 0, job: 'Creator' },
          { episodeCount: 2, job: 'Writer' },
          { episodeCount: 9, job: 'Executive Producer' },
        ],
        ['Creator', 'Writer', 'Executive Producer'],
      ),
    ).toBe('Created, wrote 2 episodes');
    expect(crewWork([{ episodeCount: 0, job: 'Creator' }], ['Creator'])).toBe(
      'Created',
    );
  });

  it('keeps the titles for a producer only', () => {
    expect(
      crewWork(
        [{ episodeCount: 0, job: 'Executive Producer' }],
        ['Executive Producer'],
      ),
    ).toBe('Executive producer');
    expect(crewWork(undefined, ['Director'])).toBe('Director');
  });
});
