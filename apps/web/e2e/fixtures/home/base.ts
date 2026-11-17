import type { Episode, Genre, TvSeries } from '@tvseri.es/schemas';

/**
 * Fixture plumbing for the home page. The stub API (e2e/stub-api)
 * and the dev preview (/dev/home) render the sample shows. Images are
 * TMDB-shaped URLs named after the canvas images (`__IMG__<name>__`), so the
 * page's CSP and the TMDB loader treat them like the real thing; a local
 * screenshot tool can answer them from the canvas image folder (an image and
 * a page screenshot then show the same artwork). In tests they don't load.
 *
 * Every fixture file only imports from other fixture files with a `.ts`
 * extension, so Node runs them as is (type stripping) in the stub server.
 */
const TMDB = 'https://image.tmdb.org/t/p';

/** The API's default size segment for the kind of image a name is */
function segmentFor(name: string): string {
  if (name.includes('_bd')) {
    return 'w1920_and_h1080_multi_faces';
  }
  if (/(^|_)p_|_p\./.test(name)) {
    return 'w300_and_h450_bestv2';
  }
  if (name.includes('logo') || name.includes('prov')) {
    return 'w500';
  }
  if (name.startsWith('ep_s')) {
    return 'w454_and_h254_bestv2';
  }
  return 'original';
}

/** A sample image (`__IMG__<name>__`) as a TMDB image URL */
export const img = (name: string) => `${TMDB}/${segmentFor(name)}/${name}`;

/** Today in the demo: Wed 11 Nov 2026 (the demo days are Mon 9 to Sat 14) */
export const FIXTURE_TODAY = '2026-11-11';

const GENRES: Readonly<Record<string, Genre>> = {
  'Action & Adventure': {
    id: 10759,
    name: 'Action & Adventure',
    slug: 'action-adventure',
  },
  Comedy: { id: 35, name: 'Comedy', slug: 'comedy' },
  Crime: { id: 80, name: 'Crime', slug: 'crime' },
  Documentary: { id: 99, name: 'Documentary', slug: 'documentary' },
  Drama: { id: 18, name: 'Drama', slug: 'drama' },
  Mystery: { id: 9648, name: 'Mystery', slug: 'mystery' },
  Reality: { id: 10764, name: 'Reality', slug: 'reality' },
  'Sci-Fi & Fantasy': {
    id: 10765,
    name: 'Sci-Fi & Fantasy',
    slug: 'sci-fi-fantasy',
  },
};

export const slugify = (title: string) =>
  title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export type SeriesInput = Readonly<{
  backdrop?: string;
  color?: string;
  description?: string;
  /** genre name, e.g. 'Sci-Fi & Fantasy' */
  genre?: string;
  id: number;
  logo?: string;
  /** the logo's width / height (`titleTreatmentAspectRatio`) */
  logoRatio?: number;
  network?: Readonly<{ id: number; logo?: string; name: string }>;
  nextEpisodeToAir?: Readonly<{
    airDate: string;
    episodeNumber: number;
    seasonNumber: number;
  }>;
  numberOfEpisodes?: number;
  poster?: string;
  seasons?: number;
  status?: TvSeries['status'];
  tagline?: string;
  title: string;
  voteAverage?: number;
  voteCount?: number;
  /** first air year */
  year: string;
}>;

const episode = (
  input: Readonly<{
    airDate: string;
    episodeNumber: number;
    seasonNumber: number;
  }>,
): Episode => ({
  airDate: input.airDate,
  description: '',
  episodeNumber: input.episodeNumber,
  hasAired: false,
  id: input.seasonNumber * 1000 + input.episodeNumber,
  runtime: 0,
  seasonNumber: input.seasonNumber,
  stillImage: '',
  stillPath: '',
  title: '',
});

/** A full `TvSeries` as the API sends it, from the few fields the sample shows */
export function series(input: SeriesInput): TvSeries {
  const genre = input.genre ? GENRES[input.genre] : undefined;
  return {
    backdropColor: input.color ?? '#1c2223',
    backdropImage: input.backdrop ? img(input.backdrop) : undefined,
    backdropPath: input.backdrop ? `/${input.backdrop}` : undefined,
    countries: [],
    createdBy: [],
    description: input.description ?? '',
    firstAirDate: `${input.year}-01-01`,
    genres: genre ? [genre] : [],
    hasAired: true,
    id: input.id,
    isAdult: false,
    languages: [],
    lastAirDate: '',
    lastEpisodeToAir: null,
    network: input.network
      ? {
          id: input.network.id,
          logo: input.network.logo ? img(input.network.logo) : '',
          name: input.network.name,
        }
      : undefined,
    nextEpisodeToAir: input.nextEpisodeToAir
      ? episode(input.nextEpisodeToAir)
      : null,
    numberOfAiredEpisodes: input.numberOfEpisodes ?? 0,
    numberOfEpisodes: input.numberOfEpisodes ?? 0,
    numberOfSeasons: input.seasons ?? 1,
    originalLanguage: 'en',
    originalTitle: input.title,
    popularity: 100,
    posterImage: input.poster ? img(input.poster) : '',
    posterPath: input.poster ? `/${input.poster}` : '',
    releaseYear: input.year,
    slug: slugify(input.title),
    status: input.status ?? 'Returning Series',
    tagline: input.tagline ?? '',
    title: input.title,
    ...(input.logo &&
      input.logoRatio && { titleTreatmentAspectRatio: input.logoRatio }),
    titleTreatmentImage: input.logo ? img(input.logo) : undefined,
    type: 'Scripted',
    voteAverage: input.voteAverage ?? 8,
    voteCount: input.voteCount ?? 1000,
  };
}
