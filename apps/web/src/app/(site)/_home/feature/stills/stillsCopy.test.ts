import { describe, expect, it } from 'vitest';

import { seasonFacts, stillLabel } from './stillsCopy';

/** The facts as written, with their non-breaking spaces as plain ones */
const facts = (season: Parameters<typeof seasonFacts>[0]) =>
  seasonFacts(season).replaceAll('\u00a0', ' ');

describe('seasonFacts', () => {
  it('names the episode count and the month the season aired', () => {
    expect(facts({ airDate: '2023-06-22', numberOfEpisodes: 10 })).toBe(
      '10 episodes, June 2023',
    );
  });

  it('reads a full ISO time as its day', () => {
    expect(
      facts({ airDate: '2016-07-15T00:00:00Z', numberOfEpisodes: 1 }),
    ).toBe('1 episode, July 2016');
  });

  it('leaves out what it doesn’t know', () => {
    expect(facts({ airDate: '', numberOfEpisodes: 8 })).toBe('8 episodes');
    expect(facts({ airDate: '2023-06-22', numberOfEpisodes: 0 })).toBe(
      'June 2023',
    );
  });

  it('never breaks a count from its noun or a month from its year', () => {
    expect(seasonFacts({ airDate: '2023-06-22', numberOfEpisodes: 10 })).toBe(
      '10\u00a0episodes, June\u00a02023',
    );
  });
});

describe('stillLabel', () => {
  it('names the series, the episode code and the episode', () => {
    expect(
      stillLabel({
        episodeNumber: 1,
        seasonNumber: 2,
        seriesTitle: 'The Bear',
        title: 'Beef',
      }),
    ).toBe('The Bear S02E01 Beef');
  });

  it('drops a missing episode title', () => {
    expect(
      stillLabel({
        episodeNumber: 11,
        seasonNumber: 2,
        seriesTitle: 'The Bear',
        title: '',
      }),
    ).toBe('The Bear S02E11');
  });
});
