import type { Episode, Season, TvSeries } from '@tvseri.es/schemas';

import { img, imgPath } from '../show/catalog.ts';

/**
 * A small catalogue for the importer: the shows of the sample
 * Netflix file, shaped like the API's `GET /search/series`, `/series/:id` and
 * `/series/:id/season/:n`. Ids start at 910001 so they never meet the show
 * stream's (136315, 900001 to 900003, 1396, 34307, 76331).
 *
 * - Two "Top Boy" (2011 Channel 4, 2019 Netflix) and two "Unsolved Mysteries"
 *   (1988, 2020): both have a season 1 episode 1, so those rows are ambiguous.
 * - "Stranger Things" has 5 seasons; "Chapter One: The Crawl" is in season 5.
 * - "Black Mirror": season 7 "Common People", season 0 "White Christmas".
 * - "TYSON" is a limited series (season 1), "Taken: Natalee Holloway" has the
 *   episode title only.
 * - "Wednesday" season 2 has no "Part 1 Recap".
 * - "Trust No One" is absent: it is a film.
 */

type Spec = Readonly<{
  id: number;
  title: string;
  year: string;
  network: string;
  poster: string;
  popularity: number;
  /** season number -> episode titles (numbered from 1) */
  seasons: Readonly<Record<number, ReadonlyArray<string>>>;
}>;

const numbered = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `Episode ${i + 1}`);

/** The matcher's tests run against this catalogue. */
export const SPECS: ReadonlyArray<Spec> = [
  {
    id: 910001,
    network: 'Channel 4',
    popularity: 40,
    poster: '',
    seasons: { 1: numbered(4), 2: numbered(4) },
    title: 'Top Boy',
    year: '2011',
  },
  {
    id: 910002,
    network: 'Netflix',
    popularity: 90,
    poster: 'set_p_topboy2019.jpg',
    seasons: { 1: numbered(10), 2: numbered(10), 3: numbered(10) },
    title: 'Top Boy',
    year: '2019',
  },
  {
    id: 910003,
    network: 'NBC',
    popularity: 20,
    poster: '',
    seasons: { 1: numbered(8), 2: numbered(8) },
    title: 'Unsolved Mysteries',
    year: '1988',
  },
  {
    id: 910004,
    network: 'Netflix',
    popularity: 70,
    poster: '',
    seasons: { 1: numbered(6), 2: numbered(6) },
    title: 'Unsolved Mysteries',
    year: '2020',
  },
  {
    id: 910005,
    network: 'Netflix',
    popularity: 300,
    poster: '',
    seasons: {
      1: [
        'Chapter One: The Vanishing of Will Byers',
        'Chapter Two: The Weirdo on Maple Street',
      ],
      2: ['Chapter One: MADMAX', 'Chapter Two: Trick or Treat, Freak'],
      3: ['Chapter One: Suzie, Do You Copy?', 'Chapter Two: The Mall Rats'],
      4: ['Chapter One: The Hellfire Club', 'Chapter Two: Vecna’s Curse'],
      5: [
        'Chapter One: The Crawl',
        'Chapter Two: The Vanishing of Holly Wheeler',
        'Chapter Three: The Turnbow Trap',
      ],
    },
    title: 'Stranger Things',
    year: '2016',
  },
  {
    id: 910006,
    network: 'Netflix',
    popularity: 120,
    poster: '',
    seasons: {
      0: ['White Christmas'],
      1: [
        'The National Anthem',
        'Fifteen Million Merits',
        'The Entire History of You',
      ],
      7: ['Common People', 'Bête Noire', 'Hotel Reverie', 'Plaything'],
    },
    title: 'Black Mirror',
    year: '2011',
  },
  {
    id: 910007,
    network: 'Netflix',
    popularity: 15,
    poster: 'set_p_tyson.jpg',
    seasons: { 1: ['Human'] },
    title: 'TYSON',
    year: '2026',
  },
  {
    id: 910008,
    network: 'Netflix',
    popularity: 25,
    poster: 'set_p_taken.jpg',
    seasons: { 1: ['I Knew He Would Kill Again', 'The Last Seen'] },
    title: 'Taken: Natalee Holloway',
    year: '2026',
  },
  {
    id: 910009,
    network: 'Netflix',
    popularity: 150,
    poster: '',
    seasons: {
      1: ['Wednesday’s Child Is Full of Woe', 'Woe Is the Loneliest Number'],
      2: ['Here We Woe Again', 'Woe What a Night', 'Call of the Woe'],
    },
    title: 'Wednesday',
    year: '2022',
  },
];

const slug = (spec: Spec) =>
  `${spec.id}-${spec.title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')}`;

const episodeOf = (
  spec: Spec,
  seasonNumber: number,
  episodeNumber: number,
  title: string,
): Episode => ({
  airDate: `${spec.year}-01-${String(episodeNumber).padStart(2, '0')}T00:00:00.000Z`,
  description: '',
  episodeNumber,
  hasAired: true,
  id: spec.id * 1000 + seasonNumber * 100 + episodeNumber,
  runtime: 50,
  seasonNumber,
  stillImage: '',
  stillPath: '',
  title,
});

const seasonNumbersOf = (spec: Spec): number[] =>
  Object.keys(spec.seasons)
    .map(Number)
    .sort((a, b) => a - b);

export const toSeason = (spec: Spec, seasonNumber: number): Season | null => {
  const titles = spec.seasons[seasonNumber];
  if (!titles) {
    return null;
  }
  return {
    airDate: `${spec.year}-01-01T00:00:00.000Z`,
    description: '',
    episodes: titles.map((title, i) =>
      episodeOf(spec, seasonNumber, i + 1, title),
    ),
    hasAired: true,
    id: spec.id * 100 + seasonNumber,
    numberOfAiredEpisodes: titles.length,
    numberOfEpisodes: titles.length,
    seasonNumber,
    title: seasonNumber === 0 ? 'Specials' : `Season ${seasonNumber}`,
  };
};

export const toSeries = (spec: Spec): TvSeries => {
  const seasons = seasonNumbersOf(spec);
  const episodes = seasons.reduce(
    (sum, n) => sum + (spec.seasons[n]?.length ?? 0),
    0,
  );
  return {
    backdropColor: '#1c2223',
    countries: [],
    createdBy: [],
    description: '',
    firstAirDate: `${spec.year}-01-01`,
    genres: [],
    hasAired: true,
    id: spec.id,
    isAdult: false,
    languages: [],
    lastAirDate: '',
    network: { id: 1, logo: '', name: spec.network },
    numberOfAiredEpisodes: episodes,
    numberOfEpisodes: episodes,
    numberOfSeasons: seasons.filter((n) => n > 0).length,
    originalLanguage: 'en',
    originalTitle: spec.title,
    popularity: spec.popularity,
    posterImage: img(spec.poster),
    posterPath: imgPath(spec.poster),
    releaseYear: spec.year,
    seasons: seasons.map((n) => toSeason(spec, n) as Season),
    slug: slug(spec),
    status: 'Ended',
    tagline: '',
    title: spec.title,
    type: 'Scripted',
    voteAverage: 0,
    voteCount: 0,
  };
};

export const specById = (id: number): Spec | undefined =>
  SPECS.find((spec) => spec.id === id);

/** The normalised title the web searches for, as the API answers it. */
export const searchCatalogue = (q: string): ReadonlyArray<TvSeries> =>
  SPECS.filter((spec) => spec.title.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.popularity - a.popularity)
    .map(toSeries);
