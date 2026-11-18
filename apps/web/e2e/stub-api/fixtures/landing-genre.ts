import type { GenreLandingFacts, LandingThemeChip } from '@tvseri.es/schemas';

import type { StubRoute } from '../types';
import { themeChip } from './landing-theme';

/**
 * `GET /discover/landing/genre/:slug/facts` for every genre landing. Crime
 * carries realistic numbers (10,927 shows, 71% also Drama, 3,180 started in
 * the 2010s, 1,040 new in the last year, six sub-genre chips); the others,
 * and the genres TMDB only has as a keyword (Horror, Thriller, Romance), are
 * plausible stand-ins so every genre renders.
 */

type Genre = Readonly<{ id: number; name: string; slug: string }>;

/** The genres TMDB only has as a keyword: landings, never another genre's share */
const KEYWORD_GENRES: ReadonlyArray<Genre> = [
  { id: 315058, name: 'Horror', slug: 'horror' },
  { id: 316362, name: 'Thriller', slug: 'thriller' },
  { id: 9840, name: 'Romance', slug: 'romance' },
];

const GENRES: ReadonlyArray<Genre> = [
  { id: 10759, name: 'Action & Adventure', slug: 'action-adventure' },
  { id: 16, name: 'Animation', slug: 'animation' },
  { id: 35, name: 'Comedy', slug: 'comedy' },
  { id: 80, name: 'Crime', slug: 'crime' },
  { id: 99, name: 'Documentary', slug: 'documentary' },
  { id: 18, name: 'Drama', slug: 'drama' },
  { id: 10751, name: 'Family', slug: 'family' },
  { id: 10762, name: 'Kids', slug: 'kids' },
  { id: 9648, name: 'Mystery', slug: 'mystery' },
  { id: 10763, name: 'News', slug: 'news' },
  { id: 10764, name: 'Reality', slug: 'reality' },
  { id: 10765, name: 'Sci-Fi & Fantasy', slug: 'sci-fi-fantasy' },
  { id: 10766, name: 'Soap', slug: 'soap' },
  { id: 10767, name: 'Talk', slug: 'talk' },
  { id: 10768, name: 'War & Politics', slug: 'war-politics' },
  { id: 37, name: 'Western', slug: 'western' },
];

/** Crime's sub-genre chips, as the theme list names them */
const CRIME_CHIPS: ReadonlyArray<LandingThemeChip> = [
  themeChip('detectives', 1860),
  themeChip('serial-killers', 640),
  themeChip('organised-crime', 1120),
  themeChip('police', 2310),
  themeChip('murder-mysteries', 410),
  themeChip('true-crime', 380),
];

const OTHER_CHIPS: ReadonlyArray<LandingThemeChip> = [
  themeChip('family-dramas', 420),
  themeChip('small-town', 380),
  themeChip('coming-of-age', 260),
  themeChip('revenge', 240),
];

const share = (genre: Genre, count: number, percent: number) => ({
  count: Math.round((count * percent) / 100),
  id: genre.id,
  name: genre.name,
  percent,
  slug: genre.slug,
});

const byName = (name: string) =>
  GENRES.find((genre) => genre.name === name) as Genre;

const crime: GenreLandingFacts = {
  alsoWith: [
    share(byName('Drama'), 10_927, 71),
    share(byName('Mystery'), 10_927, 22),
    share(byName('Action & Adventure'), 10_927, 14),
  ],
  byKind: CRIME_CHIPS.slice(0, 4),
  count: 10_927,
  newLastYear: 1040,
  peakDecade: { count: 3180, slug: '2010s' },
  slug: 'crime',
  subGenres: CRIME_CHIPS,
  type: 'genre',
};

const standIn = (genre: Genre, index: number): GenreLandingFacts => {
  const count = 1200 + index * 1873;
  const partners = GENRES.filter((other) => other !== genre).slice(
    index % 5,
    (index % 5) + 2,
  );
  return {
    alsoWith: partners.map((partner, rank) =>
      share(partner, count, 48 - rank * 20),
    ),
    byKind: OTHER_CHIPS.slice(0, 3),
    count,
    newLastYear: Math.round(count / 11),
    peakDecade: { count: Math.round(count * 0.3), slug: '2010s' },
    slug: genre.slug,
    subGenres: OTHER_CHIPS,
    type: 'genre',
  };
};

const FACTS: Readonly<Record<string, GenreLandingFacts>> = Object.fromEntries(
  [...GENRES, ...KEYWORD_GENRES].map((genre, index) => [
    genre.slug,
    genre.slug === 'crime' ? crime : standIn(genre, index),
  ]),
);

export const routes: readonly StubRoute[] = [
  {
    handle: ({ params }) => {
      const facts = FACTS[(params.slug ?? '').toLowerCase()];
      return facts
        ? { body: facts }
        : { body: { message: 'Not Found' }, status: 404 };
    },
    path: '/discover/landing/genre/:slug/facts',
  },
];
