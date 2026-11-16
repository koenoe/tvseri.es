import type { TvSeries } from '@tvseri.es/schemas';

import type { StubRoute } from '../types';

const POSTER = 'https://image.tmdb.org/t/p/w300_and_h450_bestv2';

type Seed = Readonly<{
  firstAirDate: string;
  id: number;
  network: string;
  posterPath: string;
  slug: string;
  title: string;
}>;

/** A list-shaped show (what `/collection/*` sends): the fields lists use. */
function show({
  firstAirDate,
  id,
  network,
  posterPath,
  slug,
  title,
}: Seed): TvSeries {
  return {
    backdropColor: '#1c2223',
    countries: [],
    createdBy: [],
    description: '',
    firstAirDate,
    genres: [],
    hasAired: true,
    id,
    isAdult: false,
    languages: [{ code: 'en', englishName: 'English', name: 'English' }],
    lastAirDate: '',
    network: { id: 0, logo: '', name: network },
    numberOfAiredEpisodes: 0,
    numberOfEpisodes: 0,
    numberOfSeasons: 0,
    originalLanguage: 'en',
    originalTitle: title,
    popularity: 0,
    posterImage: `${POSTER}${posterPath}`,
    posterPath,
    releaseYear: firstAirDate.slice(0, 4),
    slug,
    status: 'Returning Series',
    tagline: '',
    title,
    type: 'Scripted',
    voteAverage: 0,
    voteCount: 0,
  };
}

/** Real TMDB ids, titles and poster paths (public catalogue data). */
const TRENDING = [
  show({
    firstAirDate: '2025-11-06',
    id: 225171,
    network: 'Apple TV',
    posterPath: '/z7Nga7Q9IGFWs5OEduY2gGFxnX3.jpg',
    slug: 'pluribus',
    title: 'Pluribus',
  }),
  show({
    firstAirDate: '2025-01-09',
    id: 250307,
    network: 'HBO Max',
    posterPath: '/kvFSpESyBZMjaeOJDx7RS3P1jey.jpg',
    slug: 'the-pitt',
    title: 'The Pitt',
  }),
  show({
    firstAirDate: '2022-04-01',
    id: 95480,
    network: 'Apple TV',
    posterPath: '/AdYr4DjOgXvDUMwu6vEhZy1Rnxk.jpg',
    slug: 'slow-horses',
    title: 'Slow Horses',
  }),
  show({
    firstAirDate: '2017-12-01',
    id: 70523,
    network: 'Netflix',
    posterPath: '/wiiyc3m6HKaQhFBYeuM7ySCNQsG.jpg',
    slug: 'dark',
    title: 'Dark',
  }),
  show({
    firstAirDate: '2025-03-26',
    id: 247767,
    network: 'Apple TV',
    posterPath: '/2c6ofLTa5CRfeQjVA1bWiYBdxQN.jpg',
    slug: 'the-studio',
    title: 'The Studio',
  }),
  show({
    firstAirDate: '2022-02-17',
    id: 95396,
    network: 'Apple TV',
    posterPath: '/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg',
    slug: 'severance',
    title: 'Severance',
  }),
  show({
    firstAirDate: '2022-06-23',
    id: 136315,
    network: 'FX',
    posterPath: '/eKfVzzEazSIjJMrw9ADa2x8ksLz.jpg',
    slug: 'the-bear',
    title: 'The Bear',
  }),
  show({
    firstAirDate: '2023-05-04',
    id: 125988,
    network: 'Apple TV',
    posterPath: '/r2QXomqKjkKHVtYGGtkf2l2Y7go.jpg',
    slug: 'silo',
    title: 'Silo',
  }),
  show({
    firstAirDate: '2023-01-26',
    id: 136311,
    network: 'Apple TV',
    posterPath: '/zEFKMNPBKq6JG7uuDkzTQ9WwErn.jpg',
    slug: 'shrinking',
    title: 'Shrinking',
  }),
  show({
    firstAirDate: '2008-01-20',
    id: 1396,
    network: 'AMC',
    posterPath: '/anFx9aTOOYqgS3v7x3R84Kz67ly.jpg',
    slug: 'breaking-bad',
    title: 'Breaking Bad',
  }),
] satisfies TvSeries[];

/** `GET /collection/trending`: the 404's posters and Pick one for me. */
export const routes: readonly StubRoute[] = [
  { handle: () => ({ body: TRENDING }), path: '/collection/trending' },
];
