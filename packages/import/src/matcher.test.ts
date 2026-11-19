import type { Episode, Season, TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it, vi } from 'vitest';

import {
  type Catalog,
  compareTitles,
  createEpisodeMatcher,
  normalizeTitle,
} from './matcher';

const episode = (
  seasonNumber: number,
  episodeNumber: number,
  title: string,
): Episode => ({
  airDate: '2024-01-01',
  description: '',
  episodeNumber,
  hasAired: true,
  id: seasonNumber * 1000 + episodeNumber,
  runtime: 50,
  seasonNumber,
  stillImage: '',
  stillPath: '',
  title,
});

type Spec = Readonly<{
  id: number;
  title: string;
  year: string;
  network?: string;
  /** ISO 3166-1 code of the origin country */
  country?: string;
  /** season number -> episode titles (episode numbers from 1) */
  seasons: Readonly<Record<number, ReadonlyArray<string>>>;
}>;

const seriesOf = (spec: Spec): TvSeries =>
  ({
    firstAirDate: `${spec.year}-01-01`,
    id: spec.id,
    ...(spec.network
      ? { network: { id: 1, logo: '', name: spec.network } }
      : {}),
    ...(spec.country
      ? { originCountry: { code: spec.country, name: spec.country } }
      : {}),
    numberOfSeasons: Math.max(...Object.keys(spec.seasons).map(Number)),
    posterImage: `https://img.example.com/${spec.id}.jpg`,
    posterPath: `/${spec.id}.jpg`,
    releaseYear: spec.year,
    seasons: Object.keys(spec.seasons).map((n) => ({
      seasonNumber: Number(n),
    })),
    slug: `${spec.id}-${spec.title.toLowerCase().replace(/\W+/g, '-')}`,
    title: spec.title,
  }) as unknown as TvSeries;

const seasonOf = (spec: Spec, seasonNumber: number): Season | null => {
  const titles = spec.seasons[seasonNumber];
  return titles
    ? ({
        episodes: titles.map((title, i) => episode(seasonNumber, i + 1, title)),
        seasonNumber,
      } as unknown as Season)
    : null;
};

const SPECS: ReadonlyArray<Spec> = [
  {
    id: 1,
    network: 'Channel 4',
    seasons: { 1: ['Episode One', 'Episode Two', 'Episode Three'], 2: ['Ra'] },
    title: 'Top Boy',
    year: '2011',
  },
  {
    id: 2,
    network: 'Netflix',
    seasons: {
      1: ['Episode One', 'Episode Two'],
      2: ['Gold'],
      3: ['Haven', 'Isles'],
    },
    title: 'Top Boy',
    year: '2019',
  },
  {
    id: 3,
    seasons: {
      1: ['Chapter One: The Hellfire Club'],
      5: ['Chapter One: The Crawl', 'Chapter Two: The Vanishing'],
    },
    title: 'Stranger Things',
    year: '2016',
  },
  {
    id: 4,
    seasons: { 0: ['White Christmas'], 7: ['Common People', 'Bête Noire'] },
    title: 'Black Mirror',
    year: '2011',
  },
  {
    id: 5,
    seasons: { 1: ['Human'] },
    title: 'TYSON',
    year: '2026',
  },
  {
    id: 6,
    seasons: { 2: ['Here We Woe-Go'] },
    title: 'Wednesday',
    year: '2022',
  },
  {
    id: 7,
    seasons: { 1: ['Pilot'] },
    title: 'Wednesday Addams',
    year: '2030',
  },
  {
    id: 8,
    seasons: { 1: ['Something'] },
    title: 'Another Show',
    year: '2020',
  },
  {
    id: 9,
    seasons: {
      1: ['The Reunion Part 1', 'The Reunion Part 2', 'Goodbye'],
      2: ['Common People', 'Again'],
    },
    title: 'Reunion Show',
    year: '2015',
  },
  {
    id: 10,
    seasons: {
      1: ['Water One', 'Water Two'],
      2: ['Earth One', 'Earth Two'],
      3: ['Fire One', 'Fire Two'],
    },
    title: 'Book Show',
    year: '2005',
  },
  {
    id: 11,
    seasons: { 0: ['Christmas Special'], 1: ['First', 'Second'] },
    title: 'One Season Show',
    year: '2021',
  },
  {
    id: 12,
    seasons: { 1: ['The Reunion Part 1', 'Other'] },
    title: 'Twins',
    year: '2001',
  },
  {
    id: 13,
    seasons: { 1: ['The Reunion', 'Elsewhere'] },
    title: 'Twins',
    year: '2020',
  },
  {
    id: 14,
    seasons: { 1: ['Before', 'After'] },
    title: 'Fit for TV: The Reality of the Biggest Loser',
    year: '2025',
  },
  {
    id: 15,
    seasons: {
      1: ['The Birds Don’t Sing, They Screech in Pain'],
      2: [
        'The Increasing Flimsiness of Any Bond',
        'The Increasing Weight',
        'Episode 3',
      ],
    },
    title: 'BEEF',
    year: '2023',
  },
  {
    id: 16,
    seasons: {
      1: ['Hello It’s Me', 'To Be Continued...', 'To Be Continued... Again'],
    },
    title: 'And Just Like That...',
    year: '2021',
  },
  {
    id: 17,
    seasons: { 1: ['Making Of'] },
    title: 'And Just Like That... The Documentary',
    year: '2022',
  },
  {
    id: 18,
    seasons: { 1: ['Before', 'Later'] },
    title: 'Fit for TV: The Sequel',
    year: '2026',
  },
  {
    country: 'GB',
    id: 19,
    seasons: { 1: ['Downsize', 'Work Experience'], 2: ['Merger'] },
    title: 'The Office',
    year: '2001',
  },
  {
    country: 'US',
    id: 20,
    seasons: { 1: ['Pilot', 'Diversity Day'], 2: ['The Dundies'] },
    title: 'The Office',
    year: '2005',
  },
  {
    id: 21,
    seasons: {
      1: ['Pilot', 'Cat’s in the Bag...', '...And the Bag’s in the River'],
    },
    title: 'Breaking Bad',
    year: '2008',
  },
  {
    id: 22,
    seasons: {
      1: [
        'The One Where Monica Gets a Roommate',
        'The One with the Sonogram at the End',
      ],
      2: ['The One with Ross’s New Girlfriend'],
    },
    title: 'Friends',
    year: '1994',
  },
  {
    id: 23,
    seasons: { 1: ['Episode 1', 'Episode 2'], 2: ['Episode 1', 'Episode 2'] },
    title: 'That Mitchell and Webb Look',
    year: '2006',
  },
  {
    id: 24,
    seasons: { 1: ['Episode 1', 'Episode 2'] },
    title: 'Peep Show',
    year: '2003',
  },
  {
    country: 'GB',
    id: 25,
    seasons: { 1: ['Episode 1', 'Episode 2'] },
    title: 'Derek',
    year: '2013',
  },
  {
    country: 'SG',
    id: 26,
    seasons: { 1: ['Episode 1', 'Episode 2'] },
    title: 'Derek',
    year: '2019',
  },
  {
    country: 'US',
    id: 27,
    seasons: { 1: ['Chapter 1', 'Chapter 2'], 2: ['Chapter 14'] },
    title: 'House of Cards',
    year: '2013',
  },
  {
    country: 'GB',
    id: 28,
    seasons: { 1: ['Episode 1', 'Episode 2', 'Episode 3', 'Episode 4'] },
    title: 'House of Cards',
    year: '1990',
  },
  {
    id: 29,
    seasons: { 1: ['The Return', 'Return'] },
    title: 'Echo Show',
    year: '2010',
  },
  {
    id: 30,
    seasons: { 1: ['The Return', 'Other'] },
    title: 'Mirror',
    year: '2001',
  },
  {
    id: 31,
    seasons: { 1: ['Return', 'Else'] },
    title: 'Mirror',
    year: '2012',
  },
];

const makeCatalog = (
  searchResults: Readonly<Record<string, ReadonlyArray<number>>>,
) => {
  const byId = new Map(SPECS.map((s) => [s.id, s]));
  const catalog: Catalog = {
    getSeason: vi.fn(async (id: number, seasonNumber: number) => {
      const spec = byId.get(id);
      return spec ? seasonOf(spec, seasonNumber) : null;
    }),
    getTvSeries: vi.fn(async (id: number) => {
      const spec = byId.get(id);
      return spec ? seriesOf(spec) : null;
    }),
    searchTvSeries: vi.fn(async (title: string) =>
      (searchResults[title] ?? []).flatMap((id) => {
        const spec = byId.get(id);
        return spec ? [seriesOf(spec)] : [];
      }),
    ),
  };
  return catalog;
};

const SEARCH = {
  'and just like that': [16, 17],
  beef: [15],
  'black mirror': [4],
  'book show': [10],
  'breaking bad': [21],
  derek: [25, 26],
  'echo show': [29],
  'fit for tv': [],
  'fit for tv the reality of the biggest': [14],
  'fit for tv: the': [18, 14, 8],
  'fit for tv: the reality of the biggest': [14, 8],
  friends: [22],
  'house of cards': [27, 28],
  mirror: [31, 30],
  'one season show': [11],
  'peep show': [24],
  'reunion show': [9],
  'something else': [8],
  'stranger things': [3],
  'that mitchell and webb look': [23],
  'the office': [20, 19],
  'the office (2005)': [20, 19],
  'the office (au)': [20, 19],
  'the office (uk)': [20, 19],
  'the office (us)': [20, 19],
  'top boy': [1, 2],
  'trust no one': [],
  twins: [13, 12],
  tyson: [5],
  wed: [7, 6, 8],
  wednesday: [7, 6],
};

const row = (
  title: string,
  season: string | number,
  episodeCell: string | number,
) => ({ episode: episodeCell, season, title });

describe('compareTitles / normalizeTitle', () => {
  it('exact ignores case, punctuation and accents of the slug', () => {
    expect(compareTitles('Top Boy', 'top boy')).toBe('exact');
    expect(compareTitles("Grey's Anatomy", 'Greys Anatomy')).toBe('exact');
  });

  it('similar: one contains the other, or the dice coefficient is high', () => {
    expect(compareTitles('Wednesday', 'Wednesday Addams')).toBe('similar');
    expect(compareTitles('Chapter Seven', 'Chapter Seventh')).toBe('similar');
    expect(compareTitles('Top Boy', 'Bluey')).toBe('none');
  });

  it('short slugs (CJK titles) only match exactly', () => {
    expect(compareTitles('進撃の巨人', '進撃の巨人')).toBe('exact');
    expect(compareTitles('進撃の巨人', '呪術廻戦')).toBe('none');
    expect(compareTitles('進', 'X Men')).toBe('none');
  });

  it('normalizeTitle lowercases and tidies (TV) and U.K./U.S.', () => {
    expect(normalizeTitle(' The Office (U.S.) ')).toBe('the office (us)');
    expect(normalizeTitle('Shameless (U.K.)')).toBe('shameless (uk)');
    expect(normalizeTitle('Bluey (TV)')).toBe('bluey');
  });
});

describe('createEpisodeMatcher', () => {
  it('matches Netflix rows by episode title and by number', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    const byTitle = await matcher.match(
      row('Black Mirror', 'Season 7', 'Common People'),
    );
    expect(byTitle).toMatchObject({
      episode: { episodeNumber: 1, title: 'Common People' },
      kind: 'matched',
      seasonNumber: 7,
      tvSeries: { id: 4 },
    });
    const byNumber = await matcher.match(row('Top Boy', 3, 2));
    expect(byNumber).toMatchObject({
      episode: { episodeNumber: 2, title: 'Isles' },
      kind: 'matched',
      tvSeries: { id: 2 },
    });
  });

  it('reads Stranger Things 5 and Chapter One: The Crawl', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(
        row('Stranger Things', 'Stranger Things 5', 'Chapter One: The Crawl'),
      ),
    ).toMatchObject({
      episode: { episodeNumber: 1 },
      kind: 'matched',
      seasonNumber: 5,
    });
  });

  it('Limited Series is season 1', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(row('TYSON', 'Limited Series', 'Human')),
    ).toMatchObject({ kind: 'matched', seasonNumber: 1 });
  });

  it('imports season 0 specials', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    for (const season of ['Specials', 'Season 0', 0]) {
      expect(
        await matcher.match(row('Black Mirror', season, 'White Christmas')),
      ).toMatchObject({ kind: 'matched', seasonNumber: 0 });
    }
  });

  it('no season: finds the episode title in every season', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(
        row('Stranger Things', '', 'Chapter Two: The Vanishing'),
      ),
    ).toMatchObject({
      episode: { episodeNumber: 2 },
      kind: 'matched',
      seasonNumber: 5,
    });
  });

  it('two series share the title and both have the episode: ambiguous', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    const result = await matcher.match(row('Top Boy', 'Season 1', 'Episode 1'));
    expect(result).toEqual({
      kind: 'problem',
      problem: {
        candidates: [
          {
            id: 1,
            network: 'Channel 4',
            posterImage: 'https://img.example.com/1.jpg',
            title: 'Top Boy',
            year: '2011',
          },
          {
            id: 2,
            network: 'Netflix',
            posterImage: 'https://img.example.com/2.jpg',
            title: 'Top Boy',
            year: '2019',
          },
        ],
        kind: 'ambiguous',
      },
    });
  });

  it('two series share the title and only one has the episode: matched', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(row('Top Boy', 'Season 3', 'Haven')),
    ).toMatchObject({ kind: 'matched', tvSeries: { id: 2 } });
    expect(
      await matcher.match(row('Top Boy', 'Season 1', 'Episode Three')),
    ).toMatchObject({
      kind: 'matched',
      tvSeries: { id: 1 },
    });
  });

  it('the series is chosen per row, not per title', async () => {
    const catalog = makeCatalog(SEARCH);
    const matcher = createEpisodeMatcher(catalog);
    // The first row alone fits the 2019 series; the second fits the 2011 one
    expect(await matcher.match(row('Top Boy', 3, 1))).toMatchObject({
      tvSeries: { id: 2 },
    });
    expect(await matcher.match(row('Top Boy', 1, 3))).toMatchObject({
      tvSeries: { id: 1 },
    });
    // ...with one search for the title
    expect(catalog.searchTvSeries).toHaveBeenCalledTimes(1);
  });

  it('searches once per normalised title, however the row spells it', async () => {
    const catalog = makeCatalog(SEARCH);
    const matcher = createEpisodeMatcher(catalog);
    await matcher.match(row('Black Mirror', 7, 1));
    await matcher.match(row('  BLACK MIRROR ', 7, 2));
    expect(catalog.searchTvSeries).toHaveBeenCalledTimes(1);
    expect(catalog.searchTvSeries).toHaveBeenCalledWith('black mirror');
  });

  it('no series of that name: never falls back to the first result', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    const result = await matcher.match(row('Wed', 1, 1));
    expect(result.kind).toBe('problem');
    expect(result).toMatchObject({
      problem: { kind: 'ambiguous' },
    });
  });

  it('a similar title is offered, first, never matched', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    // "Wednesday" has an exact series: matched. "Wednesday Addams" alone is only similar
    const result = await matcher.match(row('Wednesday', 'Season 1', 'Pilot'));
    // Exact "Wednesday" (id 6) has no S1: the series is known, the episode isn't
    expect(result).toMatchObject({
      kind: 'problem',
      problem: { kind: 'episode-not-found', series: { id: 6 } },
    });
  });

  it('only similar and unrelated results: ambiguous, similar ones first, at most 4', async () => {
    const catalog = makeCatalog({ 'wednesday adam': [8, 7, 6, 1, 2, 3] });
    const matcher = createEpisodeMatcher(catalog);
    const result = await matcher.match(row('Wednesday Adam', 1, 1));
    expect(result).toMatchObject({
      kind: 'problem',
      problem: { kind: 'ambiguous' },
    });
    if (result.kind === 'problem' && result.problem.kind === 'ambiguous') {
      expect(result.problem.candidates).toHaveLength(4);
      // "Wednesday Addams" (7) and "Wednesday" (6) are similar: before the rest
      expect(result.problem.candidates.slice(0, 2).map((c) => c.id)).toEqual([
        7, 6,
      ]);
    }
  });

  it('nothing found at all: series-not-found', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(
        row('Trust No One', '', 'The Hunt for the Crypto King'),
      ),
    ).toEqual({ kind: 'problem', problem: { kind: 'series-not-found' } });
  });

  it('the series is known but the episode is not: episode-not-found with that season’s episodes', async () => {
    const matcher = createEpisodeMatcher(makeCatalog({ wednesday: [6] }));
    const result = await matcher.match(
      row('Wednesday', 'Season 2', 'Part 1 Recap'),
    );
    expect(result).toEqual({
      kind: 'problem',
      problem: {
        episodes: [
          { episodeNumber: 1, seasonNumber: 2, title: 'Here We Woe-Go' },
        ],
        kind: 'episode-not-found',
        series: {
          id: 6,
          network: null,
          posterImage: 'https://img.example.com/6.jpg',
          title: 'Wednesday',
          year: '2022',
        },
      },
    });
  });

  it('without a season, episode-not-found lists the episodes of every season', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    const result = await matcher.match(row('Black Mirror', '', 'Nope Nothing'));
    expect(result).toMatchObject({
      kind: 'problem',
      problem: { kind: 'episode-not-found' },
    });
    if (
      result.kind === 'problem' &&
      result.problem.kind === 'episode-not-found'
    ) {
      expect(result.problem.episodes.map((e) => e.title)).toEqual([
        'White Christmas',
        'Common People',
        'Bête Noire',
      ]);
    }
  });

  it('two same-title series, neither has the episode: ambiguous between them', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    const result = await matcher.match(row('Top Boy', 9, 9));
    expect(result).toMatchObject({
      kind: 'problem',
      problem: { kind: 'ambiguous' },
    });
    if (result.kind === 'problem' && result.problem.kind === 'ambiguous') {
      expect(result.problem.candidates.map((c) => c.id)).toEqual([1, 2]);
    }
  });

  it('a picked series is used without a search', async () => {
    const catalog = makeCatalog(SEARCH);
    const matcher = createEpisodeMatcher(catalog);
    const result = await matcher.match({
      ...row('Top Boy', 'Season 1', 'Episode 1'),
      seriesId: 2,
    });
    expect(result).toMatchObject({ kind: 'matched', tvSeries: { id: 2 } });
    expect(catalog.searchTvSeries).not.toHaveBeenCalled();
  });

  it('a picked episode is used as it is', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    const result = await matcher.match({
      ...row('Recap thing', '', 'Part 1 Recap'),
      episodeNumber: 2,
      seasonNumber: 3,
      seriesId: 2,
    });
    expect(result).toMatchObject({
      episode: { episodeNumber: 2, title: 'Isles' },
      kind: 'matched',
      seasonNumber: 3,
    });
  });

  it('a picked series or episode that does not exist is a problem, not a guess', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(await matcher.match({ ...row('X', 1, 1), seriesId: 999 })).toEqual({
      kind: 'problem',
      problem: { kind: 'series-not-found' },
    });
    expect(
      await matcher.match({
        ...row('X', 1, 1),
        episodeNumber: 40,
        seasonNumber: 1,
        seriesId: 2,
      }),
    ).toMatchObject({ problem: { kind: 'episode-not-found' } });
  });

  // Each catalogue read is a TMDB call: a 2,000-row import must not repeat them
  it('reads each season and each picked series once per request, however many rows use it', async () => {
    const catalog = makeCatalog(SEARCH);
    const matcher = createEpisodeMatcher(catalog);
    await matcher.match(row('Black Mirror', 7, 1));
    await matcher.match(row('Black Mirror', 'Season 7', 'Bête Noire'));
    await matcher.match(row('Black Mirror', 7, 2));
    await matcher.match({ ...row('X', 3, 1), seriesId: 2 });
    await matcher.match({ ...row('X', 3, 2), seriesId: 2 });
    const seasonReads = vi
      .mocked(catalog.getSeason)
      .mock.calls.filter(([id, season]) => id === 4 && season === 7);
    expect(seasonReads).toHaveLength(1);
    expect(
      vi.mocked(catalog.getTvSeries).mock.calls.filter(([id]) => id === 2),
    ).toHaveLength(1);
  });

  it('a failed catalogue read fails the row instead of guessing a match', async () => {
    const catalog = makeCatalog(SEARCH);
    vi.mocked(catalog.searchTvSeries).mockRejectedValueOnce(
      new Error('TMDB down'),
    );
    const matcher = createEpisodeMatcher(catalog);
    await expect(matcher.match(row('Black Mirror', 7, 1))).rejects.toThrow(
      'TMDB down',
    );
  });

  it('numbers match by number only, titles by title first', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(await matcher.match(row('Black Mirror', 7, 2))).toMatchObject({
      episode: { title: 'Bête Noire' },
    });
    expect(
      await matcher.match(row('Black Mirror', 7, 'Bete Noire')),
    ).toMatchObject({ episode: { title: 'Bête Noire' } });
  });
});

const episodeTitles = (result: unknown) =>
  (
    result as {
      problem?: { episodes?: ReadonlyArray<{ title: string }> };
    }
  ).problem?.episodes?.map((e) => e.title);

describe('createEpisodeMatcher: a doubtful episode is never written', () => {
  it('a title contained in two episodes ("The Reunion" vs "Part 1"/"Part 2") is a problem, both first', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    const result = await matcher.match(
      row('Reunion Show', 'Season 1', 'The Reunion'),
    );
    expect(result).toMatchObject({
      kind: 'problem',
      problem: { kind: 'episode-not-found', series: { id: 9 } },
    });
    expect(episodeTitles(result)).toEqual([
      'The Reunion Part 1',
      'The Reunion Part 2',
      'Goodbye',
    ]);
  });

  it('a substring of one title is a problem, that episode first', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    const result = await matcher.match(
      row('Reunion Show', 'Season 1', 'union Part 2'),
    );
    expect(result).toMatchObject({
      problem: { kind: 'episode-not-found' },
    });
    expect(episodeTitles(result)?.[0]).toBe('The Reunion Part 2');
  });

  it('a near-miss spelling is a problem, that episode first', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    const result = await matcher.match(
      row('Reunion Show', 'Season 2', 'Commen People'),
    );
    expect(result).toMatchObject({ problem: { kind: 'episode-not-found' } });
    expect(episodeTitles(result)).toEqual(['Common People', 'Again']);
  });

  it('without a season, a similar title is a problem too, ranked first across seasons', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    const result = await matcher.match(row('Reunion Show', '', 'The Reunion'));
    expect(result).toMatchObject({ problem: { kind: 'episode-not-found' } });
    expect(episodeTitles(result)?.slice(0, 2)).toEqual([
      'The Reunion Part 1',
      'The Reunion Part 2',
    ]);
  });

  it('without a season, an exact title wins over a number in another season', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    // Season 1 has an episode 1 too: only the exact title decides
    expect(
      await matcher.match(row('Stranger Things', '', 'Chapter One: The Crawl')),
    ).toMatchObject({
      episode: { title: 'Chapter One: The Crawl' },
      kind: 'matched',
      seasonNumber: 5,
    });
  });

  it('same-title series: an exact episode decides, a similar one in the other does not block', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(row('Twins', 'Season 1', 'The Reunion Part 1')),
    ).toMatchObject({ kind: 'matched', tvSeries: { id: 12 } });
    expect(
      await matcher.match(row('Twins', 'Season 1', 'The Reunion')),
    ).toMatchObject({ kind: 'matched', tvSeries: { id: 13 } });
  });

  it('same-title series, only similar episodes: ambiguous, the similar one ranked first', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    // Search order is 13, 12; only 12 has a title like "Reunion Part"
    const result = await matcher.match(
      row('Twins', 'Season 1', 'Reunion Part'),
    );
    expect(result).toMatchObject({ problem: { kind: 'ambiguous' } });
    if (result.kind === 'problem' && result.problem.kind === 'ambiguous') {
      expect(result.problem.candidates.map((c) => c.id)).toEqual([12, 13]);
    }
  });
});

describe('createEpisodeMatcher: seasons it cannot read', () => {
  it('an unknown season label ("Book Two") on a show with several seasons is a problem', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    const result = await matcher.match(
      row('Book Show', 'Book Two', 'Episode 2'),
    );
    expect(result).toMatchObject({
      kind: 'problem',
      problem: { kind: 'episode-not-found', series: { id: 10 } },
    });
    // Every episode 2 first, then the rest
    expect(episodeTitles(result)?.slice(0, 3)).toEqual([
      'Water Two',
      'Earth Two',
      'Fire Two',
    ]);
  });

  it('no season and a plain number on a show with several seasons is a problem', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(await matcher.match(row('Book Show', '', 2))).toMatchObject({
      problem: { kind: 'episode-not-found' },
    });
  });

  it('an unknown label still finds an exact episode title in any season', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(row('Book Show', 'Book Two', 'Earth Two')),
    ).toMatchObject({ kind: 'matched', seasonNumber: 2 });
  });

  it('a show with one regular season (specials aside): an unknown label or no season is that season', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    for (const [season, cell] of [
      ['Book Two', 'Episode 2'],
      ['', 2],
      ['', 'Episode 2'],
    ] as const) {
      expect(
        await matcher.match(row('One Season Show', season, cell)),
      ).toMatchObject({
        episode: { title: 'Second' },
        kind: 'matched',
        seasonNumber: 1,
      });
    }
  });
});

describe('createEpisodeMatcher: titles Netflix cut short', () => {
  it('a cut show title is the start of the name: one series starts so, a match', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(
        row('Fit for TV: The Reality of the Biggest...', 'Season 1', 'After'),
      ),
    ).toMatchObject({
      episode: { title: 'After' },
      kind: 'matched',
      tvSeries: { id: 14 },
    });
  });

  it('a cut show title several series start with: the usual pick', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    const result = await matcher.match(row('Fit for TV: The…', 'Season 1', 1));
    expect(result).toMatchObject({ problem: { kind: 'ambiguous' } });
    if (result.kind === 'problem' && result.problem.kind === 'ambiguous') {
      expect(result.problem.candidates.map((c) => c.id)).toEqual([18, 14]);
    }
  });

  it('a cut episode title: the one episode in the season it starts', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(
        row('BEEF', 'Season 2', 'The Increasing Flimsiness of Any...'),
      ),
    ).toMatchObject({
      episode: { episodeNumber: 1 },
      kind: 'matched',
      seasonNumber: 2,
    });
  });

  it('a cut episode title several episodes start with is no match', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(row('BEEF', 'Season 2', 'The Increasing...')),
    ).toMatchObject({ problem: { kind: 'episode-not-found' } });
  });

  it('a number at the cut is never read: "Episode 1..." may be Episode 12', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(row('BEEF', 'Season 2', 'Episode 1...')),
    ).toMatchObject({ problem: { kind: 'episode-not-found' } });
    // Only a title starting so: "Episode 3" is the only one
    expect(
      await matcher.match(row('BEEF', 'Season 2', 'Episode...')),
    ).toMatchObject({ episode: { title: 'Episode 3' }, kind: 'matched' });
  });

  it('no season: the one episode in any season the cut title starts', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(row('BEEF', '', 'The Birds Don’t Sing…')),
    ).toMatchObject({ kind: 'matched', seasonNumber: 1 });
  });

  it('a combined title cut in the show part: the whole is the start of the show', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    // splitEntry reads it as show "Fit for TV" and a cut episode
    expect(
      await matcher.match(
        row('Fit for TV', '', 'The Reality of the Biggest...'),
      ),
    ).toMatchObject({
      problem: { kind: 'episode-not-found', series: { id: 14 } },
    });
  });

  it('a title that really ends in "..." still matches exactly', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(
        row('And Just Like That...', 'Season 1', 'To Be Continued...'),
      ),
    ).toMatchObject({
      episode: { episodeNumber: 2 },
      kind: 'matched',
      tvSeries: { id: 16 },
    });
  });
});

describe('createEpisodeMatcher: what a real Netflix sync left in review', () => {
  it('a country tag Netflix adds ("The Office (U.K.)") picks the namesake from that country', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(row('The Office (U.K.)', 'Series 1', 'Downsize')),
    ).toMatchObject({ kind: 'matched', tvSeries: { id: 19 } });
    expect(
      await matcher.match(row('The Office (U.S.)', 'Season 2', 'The Dundies')),
    ).toMatchObject({ kind: 'matched', tvSeries: { id: 20 } });
    expect(
      await matcher.match(row('The Office (US)', 'Season 1', 'Episode 1')),
    ).toMatchObject({ kind: 'matched', tvSeries: { id: 20 } });
  });

  it('a year tag ("(2005)") picks the namesake first aired that year', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(row('The Office (2005)', 'Season 1', 'Pilot')),
    ).toMatchObject({ kind: 'matched', tvSeries: { id: 20 } });
  });

  it('a tagged series without the episode: that series’ episodes to pick from', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(row('The Office (U.K.)', 'Series 1', 'Christmas')),
    ).toMatchObject({
      problem: { kind: 'episode-not-found', series: { id: 19 } },
    });
  });

  it('a tag no namesake fits is never matched', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(row('The Office (AU)', 'Season 1', 'Pilot')),
    ).toMatchObject({ kind: 'problem', problem: { kind: 'ambiguous' } });
  });

  it('a season label that is the show’s name is "season unknown": the title in any season', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(
        row('Friends', 'Friends', 'The One Where Monica Gets a Roommate...'),
      ),
    ).toMatchObject({
      episode: { episodeNumber: 1 },
      kind: 'matched',
      seasonNumber: 1,
    });
    expect(
      await matcher.match(
        row('Friends', 'Friends', 'The One with Ross’s New Girlfriend'),
      ),
    ).toMatchObject({ kind: 'matched', seasonNumber: 2 });
  });

  it('season unknown and "Episode N": only a show with one season', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(
        row(
          'That Mitchell and Webb Look',
          'That Mitchell and Webb Look',
          'Episode 1',
        ),
      ),
    ).toMatchObject({ problem: { kind: 'episode-not-found' } });
    expect(
      await matcher.match(row('Peep Show', 'Peep Show', 'Episode 2')),
    ).toMatchObject({
      episode: { episodeNumber: 2 },
      kind: 'matched',
      seasonNumber: 1,
    });
  });

  it('episode titles match past a leading article, quotes and TMDB’s trailing ellipsis', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(
        row('Breaking Bad', 'Season 1', "The Cat's in the Bag"),
      ),
    ).toMatchObject({
      episode: { episodeNumber: 2 },
      kind: 'matched',
      seasonNumber: 1,
    });
    expect(
      await matcher.match(row('Breaking Bad', '', "The Cat's in the Bag")),
    ).toMatchObject({ episode: { episodeNumber: 2 }, kind: 'matched' });
  });

  it('a loose title fits only when one episode has it; the exact title first', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(row('Echo Show', 'Season 1', 'A Return')),
    ).toMatchObject({ problem: { kind: 'episode-not-found' } });
    expect(
      await matcher.match(row('Echo Show', 'Season 1', 'Return')),
    ).toMatchObject({ episode: { episodeNumber: 2 }, kind: 'matched' });
    expect(await matcher.match(row('Echo Show', '', 'A Return'))).toMatchObject(
      { problem: { kind: 'episode-not-found' } },
    );
  });

  it('namesakes: an exact title in one beats a loose one in the other', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(row('Mirror', 'Season 1', 'The Return')),
    ).toMatchObject({ kind: 'matched', tvSeries: { id: 30 } });
    expect(
      await matcher.match(row('Mirror', 'Season 1', 'Return')),
    ).toMatchObject({ kind: 'matched', tvSeries: { id: 31 } });
    // Loose in both: the user's pick
    expect(
      await matcher.match(row('Mirror', 'Season 1', 'A Return')),
    ).toMatchObject({ problem: { kind: 'ambiguous' } });
  });

  it('namesakes: the one that has the episode wins (House of Cards season 2)', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(row('House of Cards', 'Season 2', 'Chapter 14')),
    ).toMatchObject({ kind: 'matched', tvSeries: { id: 27 } });
  });

  it('namesakes: an episode title beats an episode number in the other', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    // The 1990 serial has an episode 1 and 2, but no episode called so
    expect(
      await matcher.match(row('House of Cards', 'Season 1', 'Chapter 1')),
    ).toMatchObject({ kind: 'matched', tvSeries: { id: 27 } });
    expect(
      await matcher.match(row('House of Cards', '', 'Chapter 2')),
    ).toMatchObject({ kind: 'matched', tvSeries: { id: 27 } });
  });

  it('namesakes that both have the episode title, or both only its number, stay the user’s pick', async () => {
    const matcher = createEpisodeMatcher(makeCatalog(SEARCH));
    expect(
      await matcher.match(row('Top Boy', 'Season 1', 'Episode 1')),
    ).toMatchObject({ problem: { kind: 'ambiguous' } });
    expect(
      await matcher.match(row('Derek', 'Series 1', 'Episode 1')),
    ).toMatchObject({ problem: { kind: 'ambiguous' } });
  });
});
