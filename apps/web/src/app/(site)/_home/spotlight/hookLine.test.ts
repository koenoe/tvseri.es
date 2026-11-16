import { describe, expect, it } from 'vitest';

import { type HookSource, hookLine } from './hookLine';

const show = (fields: Partial<HookSource> = {}): HookSource => ({
  createdBy: [],
  description: '',
  nextEpisodeToAir: null,
  numberOfEpisodes: 0,
  numberOfSeasons: 0,
  status: 'Returning Series',
  tagline: '',
  ...fields,
});

const upcoming = (
  airDate: string,
  seasonNumber: number,
  episodeNumber: number,
) => ({
  airDate,
  description: '',
  episodeNumber,
  hasAired: false,
  id: 1,
  runtime: 0,
  seasonNumber,
  stillImage: '',
  stillPath: '',
  title: '',
});

describe('hookLine', () => {
  it('is the tagline when there is one', () => {
    expect(
      hookLine(
        show({
          description: 'The most miserable person on Earth.',
          tagline: 'Vince Gilligan’s first show since Better Call Saul',
        }),
      ),
    ).toBe('Vince Gilligan’s first show since Better Call Saul');
  });

  it('ignores a tagline of only spaces', () => {
    expect(
      hookLine(show({ description: 'A short overview.', tagline: '   ' })),
    ).toBe('A short overview.');
  });

  it('is the first sentence of the overview without a tagline', () => {
    expect(
      hookLine(
        show({
          description:
            'The most miserable person on Earth must save the world from happiness. Then more.',
        }),
      ),
    ).toBe(
      'The most miserable person on Earth must save the world from happiness.',
    );
  });

  it('trims a long first sentence to about 90 characters at a word boundary', () => {
    expect(
      hookLine(
        show({
          description:
            'A brilliant but troubled detective is put in charge of a new cold-case unit in the basement of Edinburgh’s police HQ. Together they reopen the files nobody wanted.',
        }),
      ),
    ).toBe(
      'A brilliant but troubled detective is put in charge of a new cold-case unit in the…',
    );
    expect(
      hookLine(
        show({
          description:
            'Follow the staff of a Pittsburgh trauma centre through a single fifteen-hour shift, hour by painful hour, as the day unravels.',
        }),
      ),
    ).toBe(
      'Follow the staff of a Pittsburgh trauma centre through a single fifteen-hour shift, hour…',
    );
  });

  it('keeps an overview without a full stop whole when it is short', () => {
    expect(hookLine(show({ description: 'No full stop, a short line' }))).toBe(
      'No full stop, a short line',
    );
  });

  it('does not end the sentence at a title or an initial', () => {
    expect(
      hookLine(
        show({
          description: 'Dr. Shaun Murphy joins St. Bonaventure hospital. More.',
        }),
      ),
    ).toBe('Dr. Shaun Murphy joins St. Bonaventure hospital.');
    expect(
      hookLine(show({ description: 'J. R. Ewing runs Dallas. More.' })),
    ).toBe('J. R. Ewing runs Dallas.');
  });

  it('names a season premiere without a tagline or overview', () => {
    expect(
      hookLine(
        show({
          nextEpisodeToAir: upcoming('2026-11-17', 4, 1),
          numberOfSeasons: 3,
        }),
      ),
    ).toBe('Season 4 premieres Nov 17');
  });

  it('says nothing about a premiere without a date', () => {
    expect(hookLine(show({ nextEpisodeToAir: upcoming('', 2, 1) }))).toBe('');
  });

  it('says nothing about an ordinary next episode', () => {
    expect(
      hookLine(show({ nextEpisodeToAir: upcoming('2026-11-15', 2, 4) })),
    ).toBe('');
  });

  it('sums up an ended show', () => {
    expect(
      hookLine(
        show({ numberOfEpisodes: 42, numberOfSeasons: 5, status: 'Ended' }),
      ),
    ).toBe('Ended: 5 seasons, 42 episodes');
    expect(
      hookLine(
        show({ numberOfEpisodes: 1, numberOfSeasons: 1, status: 'Ended' }),
      ),
    ).toBe('Ended: 1 season, 1 episode');
  });

  it('says nothing about an ended show without counts', () => {
    expect(hookLine(show({ status: 'Ended' }))).toBe('');
  });

  it('is empty when nothing qualifies', () => {
    expect(hookLine(show())).toBe('');
  });
});

const people = (...names: string[]) => names.map((name) => ({ name }));

/**
 * The derived lines, each built from the facts
 * the show has: tagline and overview empty
 */
describe('hookLine derived from facts (examples)', () => {
  it('Pluribus: a creator’s better-known show', () => {
    expect(
      hookLine(
        show({
          createdBy: people('Vince Gilligan'),
          creatorOf: { title: 'Breaking Bad' },
          topCast: ['Rhea Seehorn', 'Karolina Wydra', 'Carlos-Manuel Vesga'],
        }),
      ),
    ).toBe('From the creator of Breaking Bad');
  });

  it('Task: a creator’s better-known show', () => {
    expect(
      hookLine(
        show({
          createdBy: people('Brad Ingelsby'),
          creatorOf: { title: 'Mare of Easttown' },
          topCast: ['Mark Ruffalo', 'Tom Pelphrey', 'Emilia Jones'],
        }),
      ),
    ).toBe('From the creator of Mare of Easttown');
  });

  it('Dept. Q: a season premiere comes before a creator’s other show', () => {
    expect(
      hookLine(
        show({
          createdBy: people('Scott Frank', 'Chandni Lakhani'),
          creatorOf: { title: 'The Queen’s Gambit' },
          nextEpisodeToAir: upcoming('2026-11-12', 2, 1),
        }),
        '2026-11-11',
      ),
    ).toBe('Season 2 premieres Nov 12');
  });

  it('MobLand: the top three cast when nothing else holds', () => {
    expect(
      hookLine(
        show({
          createdBy: people('Ronan Bennett'),
          creatorOf: null,
          topCast: ['Tom Hardy', 'Helen Mirren', 'Pierce Brosnan'],
        }),
      ),
    ).toBe('With Tom Hardy, Helen Mirren and Pierce Brosnan');
  });

  it('Stranger Things: an ended show’s size comes before its cast', () => {
    expect(
      hookLine(
        show({
          createdBy: people('Matt Duffer', 'Ross Duffer'),
          creatorOf: null,
          numberOfEpisodes: 42,
          numberOfSeasons: 5,
          status: 'Ended',
          topCast: ['Winona Ryder', 'David Harbour', 'Millie Bobby Brown'],
        }),
      ),
    ).toBe('Ended: 5 seasons, 42 episodes');
  });

  it('Barry: creators who also star come before an ended show’s size', () => {
    expect(
      hookLine(
        show({
          createdBy: people('Bill Hader', 'Alec Berg'),
          creatorOf: null,
          numberOfEpisodes: 32,
          numberOfSeasons: 4,
          status: 'Ended',
          topCast: ['Bill Hader', 'Stephen Root', 'Sarah Goldberg'],
        }),
      ),
    ).toBe('From Bill Hader and Alec Berg');
  });

  it('The White Lotus: a season premiere', () => {
    expect(
      hookLine(
        show({
          createdBy: people('Mike White'),
          creatorOf: { title: 'Enlightened' },
          nextEpisodeToAir: upcoming('2026-11-17', 4, 1),
          numberOfSeasons: 3,
        }),
      ),
    ).toBe('Season 4 premieres Nov 17');
  });

  it('Dexter: Resurrection: nothing qualifies, the line is left out', () => {
    expect(hookLine(show({ creatorOf: null, topCast: [] }))).toBe('');
  });
});

describe('hookLine derived lines, the edges', () => {
  it('names one creator who also stars on their own', () => {
    expect(
      hookLine(
        show({
          createdBy: people('Phoebe Waller-Bridge'),
          topCast: ['Phoebe Waller-Bridge', 'Sian Clifford', 'Olivia Colman'],
        }),
      ),
    ).toBe('From Phoebe Waller-Bridge');
  });

  it('joins three creators with commas and “and”', () => {
    expect(
      hookLine(
        show({
          createdBy: people('Donald Glover', 'Stephen Glover', 'Kurt Johnson'),
          topCast: ['Donald Glover'],
        }),
      ),
    ).toBe('From Donald Glover, Stephen Glover and Kurt Johnson');
  });

  it('names creators only when one of them is in the top cast', () => {
    expect(
      hookLine(
        show({
          createdBy: people('Matt Duffer', 'Ross Duffer'),
          topCast: ['Winona Ryder', 'David Harbour', 'Millie Bobby Brown'],
        }),
      ),
    ).toBe('With Winona Ryder, David Harbour and Millie Bobby Brown');
  });

  it('names a cast of one or two as it is', () => {
    expect(hookLine(show({ topCast: ['Tom Hardy'] }))).toBe('With Tom Hardy');
    expect(hookLine(show({ topCast: ['Tom Hardy', 'Helen Mirren'] }))).toBe(
      'With Tom Hardy and Helen Mirren',
    );
  });

  it('names no more than three of the cast', () => {
    expect(
      hookLine(
        show({ topCast: ['Tom Hardy', 'Helen Mirren', 'Pierce Brosnan', 'X'] }),
      ),
    ).toBe('With Tom Hardy, Helen Mirren and Pierce Brosnan');
  });

  it('a passed premiere still comes first: the season is out', () => {
    expect(
      hookLine(
        show({
          creatorOf: { title: 'Breaking Bad' },
          nextEpisodeToAir: upcoming('2026-11-10', 2, 1),
        }),
        '2026-11-12',
      ),
    ).toBe('Season 2 is out');
  });

  it('a tagline or an overview still wins over every derived line', () => {
    const facts = {
      creatorOf: { title: 'Breaking Bad' },
      topCast: ['Rhea Seehorn'],
    };
    expect(hookLine(show({ ...facts, tagline: 'A tagline' }))).toBe(
      'A tagline',
    );
    expect(hookLine(show({ ...facts, description: 'An overview.' }))).toBe(
      'An overview.',
    );
  });
});

describe('hookLine on a later day', () => {
  it('never names a premiere date that has passed: the season is out', () => {
    const series = show({ nextEpisodeToAir: upcoming('2026-11-10', 4, 1) });
    expect(hookLine(series, '2026-11-12')).toBe('Season 4 is out');
    expect(hookLine(series, '2026-11-09')).toBe('Season 4 premieres Nov 10');
  });
});
