import { describe, expect, it } from 'vitest';

import {
  parseEpisodeNumber,
  recogniseSeasonNumber,
  splitEntry,
} from './parseEntry';

describe('splitEntry (Netflix titles)', () => {
  it.each([
    [
      'Top Boy: Season 1: Episode 1',
      { episode: 'Episode 1', season: 'Season 1', title: 'Top Boy' },
    ],
    [
      'Black Mirror: Season 7: Common People',
      { episode: 'Common People', season: 'Season 7', title: 'Black Mirror' },
    ],
    [
      'Stranger Things: Stranger Things 5: Chapter One: The Crawl',
      {
        episode: 'Chapter One: The Crawl',
        season: 'Stranger Things 5',
        title: 'Stranger Things',
      },
    ],
    [
      'TYSON: Limited Series: Human',
      { episode: 'Human', season: 'Limited Series', title: 'TYSON' },
    ],
    [
      'Taken: Natalee Holloway: I Knew He Would Kill Again',
      {
        episode: 'I Knew He Would Kill Again',
        season: '',
        title: 'Taken: Natalee Holloway',
      },
    ],
    [
      'Trust No One: The Hunt for the Crypto King',
      {
        episode: 'The Hunt for the Crypto King',
        season: '',
        title: 'Trust No One',
      },
    ],
    [
      'Beat Luke Littler',
      { episode: '', season: '', title: 'Beat Luke Littler' },
    ],
    [
      'Wednesday: Season 2: Part 1 Recap',
      { episode: 'Part 1 Recap', season: 'Season 2', title: 'Wednesday' },
    ],
    [
      'Unsolved Mysteries: Volume 3: Missing in Alaska',
      {
        episode: 'Missing in Alaska',
        season: 'Volume 3',
        title: 'Unsolved Mysteries',
      },
    ],
    [
      'Heel: Seizoen 2: Aflevering 4',
      { episode: 'Aflevering 4', season: 'Seizoen 2', title: 'Heel' },
    ],
    [
      'Show: Second Season: Pilot',
      { episode: 'Pilot', season: 'Second Season', title: 'Show' },
    ],
    [
      'Show: Season 0: Behind the Scenes',
      { episode: 'Behind the Scenes', season: 'Season 0', title: 'Show' },
    ],
    [
      'Black Mirror: Specials: White Christmas',
      { episode: 'White Christmas', season: 'Specials', title: 'Black Mirror' },
    ],
    ['Show: Chapter 3', { episode: 'Chapter 3', season: '', title: 'Show' }],
  ])('%s', (value, expected) => {
    expect(splitEntry(value)).toEqual(expected);
  });

  describe('a title Netflix cut short ("..." or "…")', () => {
    it.each([
      // The cut in the episode: the episode keeps its ellipsis, a prefix
      [
        'BEEF: Season 2: The Increasing Flimsiness of Any...',
        {
          episode: 'The Increasing Flimsiness of Any...',
          season: 'Season 2',
          title: 'BEEF',
        },
      ],
      [
        'BEEF: Season 2: The Increasing Flimsiness of Any…',
        {
          episode: 'The Increasing Flimsiness of Any…',
          season: 'Season 2',
          title: 'BEEF',
        },
      ],
      // The cut in the season: "Season 2..." may be Season 21, so no season
      // and no episode
      ['BEEF: Season 2...', { episode: '', season: '', title: 'BEEF' }],
      ['BEEF: Seas...', { episode: '', season: '', title: 'BEEF' }],
      ['TYSON: Limited Ser…', { episode: '', season: '', title: 'TYSON' }],
      [
        'Stranger Things: Stranger Things 1...',
        { episode: '', season: '', title: 'Stranger Things' },
      ],
      // The cut in the show: nothing tells it from an episode cut, so it
      // splits as one; the matcher tries the whole as the show's prefix
      [
        'Fit for TV: The Reality of the Biggest...',
        {
          episode: 'The Reality of the Biggest...',
          season: '',
          title: 'Fit for TV',
        },
      ],
    ])('%s', (value, expected) => {
      expect(splitEntry(value)).toEqual(expected);
    });
  });
});

describe('recogniseSeasonNumber', () => {
  it.each([
    ['Season 2', 2],
    ['Seizoen 3', 3],
    ['Stranger Things 5', 5],
    ['Limited Series', 1],
    ['Miniseries', 1],
    ['Miniserie', 1],
    ['Season Four', 4],
    ['2nd Season', 2],
    ['The Complete Third Season', 3],
    ['7', 7],
    ['Part 2', 2],
    ['Specials', 0],
    ['Special', 0],
    ['Season 0', 0],
    ['0', 0],
    [0, 0],
    [4, 4],
  ])('%j is %j', (value, expected) => {
    expect(recogniseSeasonNumber(value)).toBe(expected);
  });

  it('is null for an empty season: any season, by episode title', () => {
    expect(recogniseSeasonNumber('')).toBeNull();
    expect(recogniseSeasonNumber('   ')).toBeNull();
  });

  it('is null (never season 1) for a label or number it cannot read', () => {
    expect(recogniseSeasonNumber('Something else')).toBeNull();
    expect(recogniseSeasonNumber('Book Two')).toBeNull();
    expect(recogniseSeasonNumber(-2)).toBeNull();
    expect(recogniseSeasonNumber(1.5)).toBeNull();
  });
});

describe('parseEpisodeNumber', () => {
  it.each([
    ['Episode 3', 3],
    ['Aflevering 12', 12],
    ['Chapter One', 1],
    ['Chapter One: The Crawl', 1],
    ['Chapter #4', 4],
    ['3rd Episode', 3],
    ['8', 8],
    [5, 5],
  ])('%j is %j', (value, expected) => {
    expect(parseEpisodeNumber(value)).toBe(expected);
  });

  it.each([['The Crawl'], [''], ['Part 1 Recap'], [0], ['0'], [1.5]])(
    '%j is null',
    (value) => {
      expect(parseEpisodeNumber(value)).toBeNull();
    },
  );
});
