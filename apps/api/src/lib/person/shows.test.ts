import { describe, expect, it } from 'vitest';

import { mergePersonShows } from './shows';

describe('mergePersonShows', () => {
  it('puts a space before a bracket in a character name', () => {
    const { shows } = mergePersonShows(
      {
        cast: [
          {
            character: 'Dimitri / Voice of RADA(voice)',
            episode_count: 3,
            first_air_date: '2010-01-01',
            id: 1,
            name: 'Girls On Top',
          },
        ],
      },
      new Map(),
      '2026-11-13',
    );

    expect(shows[0]?.characters).toEqual(['Dimitri / Voice of RADA (voice)']);
  });

  it('carries how widely seen each show is, from the credits (Known for)', () => {
    const { shows } = mergePersonShows(
      {
        cast: [
          {
            character: 'Hal',
            episode_count: 151,
            first_air_date: '2000-01-09',
            id: 2004,
            name: 'Malcolm in the Middle',
            popularity: 61.5,
            vote_count: 4_100,
          },
        ],
        crew: [{ id: 2004, job: 'Director', name: 'Malcolm in the Middle' }],
      },
      new Map(),
      '2026-11-13',
    );

    expect(shows[0]).toMatchObject({ popularity: 61.5, voteCount: 4_100 });
  });
});
