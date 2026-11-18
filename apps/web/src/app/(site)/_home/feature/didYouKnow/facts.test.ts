import type { DidYouKnowFact, Episode, TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { deckCopy, pickPhrasings } from './facts';

const series = (extra: Partial<TvSeries>) =>
  ({
    firstAirDate: '',
    id: 1,
    lastAirDate: '',
    lastEpisodeToAir: null,
    numberOfEpisodes: 0,
    numberOfSeasons: 1,
    status: 'Ended',
    title: 'Example',
    ...extra,
  }) as TvSeries;

const fact = (
  type: DidYouKnowFact['type'],
  value: number,
  extra: Partial<TvSeries>,
): DidYouKnowFact => ({ series: series(extra), type, value });

/** Every phrasing a fact can get: the fact alone in a deck, at each place */
const allTexts = (one: DidYouKnowFact) => {
  const texts = new Set<string>();
  for (let id = 0; id < 12; id++) {
    const moved = { ...one, series: { ...one.series, id } };
    texts.add(deckCopy([moved])[0]!.text);
  }
  return [...texts];
};

const BREAKING_BAD = fact('hours', 48, {
  id: 1396,
  lastEpisodeToAir: { runtime: 47 } as Episode,
  numberOfEpisodes: 62,
  numberOfSeasons: 5,
  title: 'Breaking Bad',
});

const SOPRANOS = fact('years', 8, {
  firstAirDate: '1999-01-10',
  id: 1398,
  lastAirDate: '2007-06-10T00:00:00.000Z',
  numberOfEpisodes: 86,
  numberOfSeasons: 6,
  title: 'The Sopranos',
});

const OFFICE = fact('episodes', 201, {
  id: 2316,
  numberOfEpisodes: 201,
  numberOfSeasons: 9,
  title: 'The Office',
});

describe('deckCopy: the phrasings', () => {
  it('hours: four ways to say it, with the unit under the number', () => {
    expect(allTexts(BREAKING_BAD).sort()).toEqual([
      'All 62 episodes of Breaking Bad add up to 48 hours: two days without a break.',
      'At about 47 minutes an episode, Breaking Bad takes 48 hours from the first episode to the last.',
      'Breaking Bad is 62 episodes of about 47 minutes. Watch it back to back and it is two days of your life.',
      'One episode a night, and Breaking Bad lasts about two months.',
    ]);
    expect(deckCopy([BREAKING_BAD])[0]!.unit).toBe('hours');
  });

  it('hours: under a day the span would repeat the hours, so that one is out', () => {
    const fleabag = fact('hours', 20, {
      numberOfEpisodes: 40,
      title: 'Fleabag',
    });
    expect(allTexts(fleabag).sort()).toEqual([
      'At about 30 minutes an episode, Fleabag takes 20 hours from the first episode to the last.',
      'Fleabag is 40 episodes of about 30 minutes. Watch it back to back and it is 20 hours of your life.',
      'One episode a night, and Fleabag lasts about six weeks.',
    ]);
  });

  it('hours: "latest" while it runs; nights, weeks, months and years', () => {
    const running = fact('hours', 12, {
      lastEpisodeToAir: { runtime: 60 } as Episode,
      numberOfEpisodes: 12,
      status: 'Returning Series',
      title: 'Severance',
    });
    expect(allTexts(running)).toContain(
      'At about 60 minutes an episode, Severance takes 12 hours from the first episode to the latest.',
    );
    expect(allTexts(running)).toContain(
      'One episode a night, and Severance lasts 12 nights.',
    );
    const lasts = (episodes: number) =>
      allTexts(fact('hours', 100, { numberOfEpisodes: episodes, title: 'X' }))
        .find((text) => text.startsWith('One episode'))
        ?.replace('One episode a night, and X lasts ', '');
    expect(lasts(2)).toBe('2 nights.');
    expect(lasts(20)).toBe('about three weeks.');
    expect(lasts(35)).toBe('about five weeks.');
    expect(lasts(201)).toBe('about seven months.');
    expect(lasts(400)).toBe('about a year.');
    expect(lasts(800)).toBe('about two years.');
  });

  it('hours: a single episode gets the plain sentence', () => {
    expect(
      allTexts(fact('hours', 1, { numberOfEpisodes: 1, title: 'Special' })),
    ).toEqual(['Special runs for about 1 hour in all.']);
  });

  it('episodes: three ways, "ran" or "has run … so far"', () => {
    expect(allTexts(OFFICE).sort()).toEqual([
      '201 episodes across nine seasons: The Office from start to finish.',
      'The Office averaged 22 episodes a season over nine seasons.',
      'The Office ran nine seasons and 201 episodes.',
    ]);
    const severance = fact('episodes', 19, {
      numberOfEpisodes: 19,
      numberOfSeasons: 2,
      status: 'Returning Series',
      title: 'Severance',
    });
    expect(allTexts(severance).sort()).toEqual([
      '19 episodes across two seasons: Severance from start to now.',
      'Severance averages 10 episodes a season over two seasons.',
      'Severance has run two seasons and 19 episodes so far.',
    ]);
    expect(deckCopy([severance])[0]!.unit).toBe('episodes');
  });

  it('episodes: one season leaves only the first, in the singular', () => {
    expect(
      allTexts(
        fact('episodes', 1, {
          numberOfEpisodes: 1,
          numberOfSeasons: 1,
          title: 'Pilot',
        }),
      ),
    ).toEqual(['Pilot ran one season and 1 episode.']);
  });

  it('years: three ways with dates', () => {
    expect(allTexts(SOPRANOS).sort()).toEqual([
      'Eight years separate the first and last episode of The Sopranos.',
      'The Sopranos first aired on Jan 10, 1999. Its last episode came eight years later.',
      'The Sopranos took from Jan 10, 1999 to Jun 10, 2007 to tell its story: 86 episodes, six seasons.',
    ]);
    expect(deckCopy([SOPRANOS])[0]!.unit).toBe('years on air');
  });

  it('years: missing dates leave the date-free one; one year is singular', () => {
    expect(
      allTexts(
        fact('years', 1, {
          numberOfEpisodes: 10,
          status: 'Returning Series',
          title: 'Short',
        }),
      ),
    ).toEqual(['One year separates the first and latest episode of Short.']);
    expect(
      allTexts(fact('years', 3, { numberOfEpisodes: 1, title: 'Odd' })),
    ).toEqual(['Odd was on air for 3 years.']);
  });
});

describe('deckCopy: large numbers', () => {
  const ONE_PIECE = {
    id: 37854,
    numberOfEpisodes: 2468,
    numberOfSeasons: 22,
    status: 'Returning Series',
    title: 'One Piece',
  } as const;

  it('groups thousands in the big number, as the app does (1,234)', () => {
    const [hours, episodes] = deckCopy([
      fact('hours', 1234, ONE_PIECE),
      fact('episodes', 2468, ONE_PIECE),
    ]);
    expect(hours!.value).toBe('1,234');
    expect(episodes!.value).toBe('2,468');
    expect(deckCopy([BREAKING_BAD])[0]!.value).toBe('48');
  });

  it('groups thousands in every sentence', () => {
    const texts = [
      ...allTexts(fact('hours', 1234, ONE_PIECE)),
      ...allTexts(fact('episodes', 2468, ONE_PIECE)),
    ];
    expect(texts.sort()).toEqual([
      '2,468 episodes across 22 seasons: One Piece from start to now.',
      'All 2,468 episodes of One Piece add up to 1,234 hours: 51 days without a break.',
      'At about 30 minutes an episode, One Piece takes 1,234 hours from the first episode to the latest.',
      'One Piece averages 112 episodes a season over 22 seasons.',
      'One Piece has run 22 seasons and 2,468 episodes so far.',
      'One Piece is 2,468 episodes of about 30 minutes. Watch it back to back and it is 51 days of your life.',
      'One episode a night, and One Piece lasts about seven years.',
    ]);
  });
});

describe('pickPhrasings: the deck', () => {
  const ids = (deck: ReadonlyArray<DidYouKnowFact>) =>
    pickPhrasings(deck).map((phrasing) => phrasing.id);

  const TEMPLATES = [BREAKING_BAD, OFFICE, SOPRANOS];

  it('no two neighbours share a phrasing, the wrap from last to first included', () => {
    // Every deck of 2 to 4 facts from the three kinds, at many series ids
    for (let size = 2; size <= 4; size++) {
      for (let combo = 0; combo < 3 ** size; combo++) {
        for (let seed = 0; seed < 8; seed++) {
          const deck = Array.from({ length: size }, (_, i) => {
            const base = TEMPLATES[Math.floor(combo / 3 ** i) % 3]!;
            return {
              ...base,
              series: { ...base.series, id: seed * 7 + i * 13 },
            };
          });
          const picked = ids(deck);
          picked.forEach((id, i) => {
            expect(id).not.toBe(picked[(i + 1) % picked.length]);
          });
        }
      }
    }
  });

  it('two facts of a type in one deck read differently', () => {
    // Both start from "ran" (id + place, mod 3): the second steps on
    const at = (id: number) => ({
      ...OFFICE,
      series: { ...OFFICE.series, id },
    });
    const [, second, , fourth] = ids([
      BREAKING_BAD,
      at(2315),
      SOPRANOS,
      at(2319),
    ]);
    expect(second).toBe('episodes-ran');
    expect(fourth).not.toBe('episodes-ran');
  });

  it('is the same on every call (server and client agree)', () => {
    const deck = [BREAKING_BAD, OFFICE, SOPRANOS, BREAKING_BAD];
    expect(ids(deck)).toEqual(ids(deck));
  });

  it('the same series reads differently at another place in the deck', () => {
    const one = ids([BREAKING_BAD])[0];
    const second = ids([OFFICE, BREAKING_BAD])[1];
    expect(second).not.toBe(one);
  });
});
