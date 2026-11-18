import type { TmdbTvSeries, TmdbTvSeriesCredits } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { normalizeAggregateCrew, normalizePersons } from './helpers';

type Crew = NonNullable<TmdbTvSeriesCredits['crew']>;
type Cast = NonNullable<TmdbTvSeriesCredits['cast']>;

const crewMember = (overrides: Partial<Crew[number]>): Crew[number] => ({
  adult: false,
  gender: 2,
  id: 1,
  name: 'Christopher Storer',
  popularity: 1,
  total_episode_count: 0,
  ...overrides,
});

describe('normalizeAggregateCrew', () => {
  it('keeps the department, every job with its episodes and the total', () => {
    const crew = [
      crewMember({
        department: 'Production',
        jobs: [
          { credit_id: 'a', episode_count: 28, job: 'Executive Producer' },
          { credit_id: 'b', episode_count: 10, job: 'Casting' },
        ],
        profile_path: '/storer.jpg',
        total_episode_count: 28,
      }),
    ];

    expect(normalizeAggregateCrew(crew)).toEqual([
      {
        department: 'Production',
        id: 1,
        image: expect.stringContaining('/w138_and_h175_face/storer.jpg'),
        jobs: [
          { episodes: 28, job: 'Executive Producer' },
          { episodes: 10, job: 'Casting' },
        ],
        name: 'Christopher Storer',
        numberOfEpisodes: 28,
        slug: 'christopher-storer',
      },
    ]);
  });

  it('keeps crew without a photo, a job or a department', () => {
    const crew = [
      crewMember({
        id: 2,
        jobs: [{ episode_count: 3 }, { episode_count: 1, job: 'Gaffer' }],
        name: 'Anon Crew',
      }),
    ];

    expect(normalizeAggregateCrew(crew)).toEqual([
      {
        department: '',
        id: 2,
        image: '',
        jobs: [{ episodes: 1, job: 'Gaffer' }],
        name: 'Anon Crew',
        numberOfEpisodes: 0,
        slug: 'anon-crew',
      },
    ]);
  });

  it('lists someone once per department, as TMDB does', () => {
    const crew = [
      crewMember({ department: 'Writing', jobs: [] }),
      crewMember({ department: 'Directing', jobs: [] }),
    ];

    expect(
      normalizeAggregateCrew(crew).map((person) => person.department),
    ).toEqual(['Writing', 'Directing']);
  });

  it('is empty without a crew', () => {
    expect(normalizeAggregateCrew(undefined)).toEqual([]);
  });
});

describe('normalizePersons', () => {
  it('keeps the cast’s shape: the first character and the episode total', () => {
    const cast: Cast = [
      {
        adult: false,
        gender: 2,
        id: 3,
        name: 'Jeremy Allen White',
        order: 0,
        popularity: 1,
        profile_path: '/white.jpg',
        roles: [
          { character: 'Carmy Berzatto', episode_count: 28 },
          { character: 'Young Carmy', episode_count: 1 },
        ],
        total_episode_count: 28,
      },
    ];

    expect(normalizePersons(cast)).toEqual([
      {
        character: 'Carmy Berzatto',
        id: 3,
        image: expect.stringContaining('/w138_and_h175_face/white.jpg'),
        job: '',
        name: 'Jeremy Allen White',
        numberOfEpisodes: 28,
        slug: 'jeremy-allen-white',
      },
    ]);
  });

  it('keeps the creators’ shape: no character, job or episodes', () => {
    const creators = [
      { id: 1, name: 'Christopher Storer', profile_path: '' },
    ] as TmdbTvSeries['created_by'];

    expect(normalizePersons(creators)).toEqual([
      {
        character: '',
        id: 1,
        image: '',
        job: '',
        name: 'Christopher Storer',
        numberOfEpisodes: 0,
        slug: 'christopher-storer',
      },
    ]);
  });
});
