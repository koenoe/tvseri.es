import type {
  Episode,
  EpisodeCredits,
  EpisodePerson,
  Genre,
  Keyword,
  Person,
  Rating,
  Season,
  SeasonRatings,
  Status,
  TvSeries,
  WatchProvider,
} from '@tvseri.es/schemas';

import { CATALOGUE, catalogueId, seasonSizes } from '../discover/catalogue.ts';
import { imageUrl } from '../discover/shows.ts';
import { BEAR_EPISODES, BEAR_REGULARS } from './bearData.ts';
import type { RawEpisode, RawPerson } from './types.ts';

/**
 * The shows the stub serves. "Today" is fixed so airing states don't drift:
 * episodes with an air date after it have not aired.
 */
export const TODAY = '2026-11-12';

/** The show-page demo states, by id. */
export const SHOW_IDS = {
  airing: 900001,
  bear: 136315,
  huge: 900003,
  long: 900002,
  /** Two seasons and three specials (season 0), the last not out yet. */
  specials: 900006,
  /** A typical show for the placeholder checks: real-length text everywhere. */
  typical: 900004,
  /** Premieres three days after "today": nothing aired, no stills yet. */
  unreleased: 900005,
} as const;

/** A show with more aired episodes than this answers 413 to the show mark. */
export const MAX_EPISODES_PER_SERIES_MARK = 1000;

/** `STUB_ASSETS_URL/img/<name>` (the auth/assets stub), or '' without it. */
export const img = (name: string): string =>
  name && process.env.STUB_ASSETS_URL
    ? `${process.env.STUB_ASSETS_URL}/img/${name}`
    : '';

/** A TMDB-style path for an image name: `/name.jpg`. */
export const imgPath = (name: string): string => (name ? `/${name}` : '');

const isoDate = (date: string): string => `${date}T00:00:00.000Z`;

export const addDays = (date: string, days: number): string =>
  new Date(Date.parse(isoDate(date)) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

const slugify = (text: string): string =>
  text
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');

export type StubEpisode = RawEpisode & Readonly<{ id: number }>;

type Recommendation = Readonly<{
  genres: ReadonlyArray<string>;
  id: number;
  poster: string;
  title: string;
  year: string;
}>;

export type StubShow = Readonly<{
  backdrop: string;
  backdropColor: string;
  cast: ReadonlyArray<RawPerson>;
  creators: ReadonlyArray<string>;
  crew: ReadonlyArray<Readonly<{ id: number; job: string; name: string }>>;
  episodes: ReadonlyArray<StubEpisode>;
  genres: ReadonlyArray<string>;
  id: number;
  imdbId: string;
  keywords: ReadonlyArray<string>;
  lastAirDate: string;
  logo: string;
  /** The show's network; Hulu when left out */
  network?: Readonly<{
    id: number;
    logo: string;
    logoSilhouette?: boolean;
    name: string;
  }>;
  originalTitle: string;
  overview: string;
  poster: string;
  ratingValue: number;
  ratingVotes: number;
  /** Age ratings by region; the stub's shared ones when left out. */
  contentRatings?: Readonly<Record<string, string>>;
  /** No streaming service in any region. */
  noProviders?: boolean;
  recommendations: ReadonlyArray<Recommendation>;
  slug: string;
  status: Status;
  tagline: string;
  title: string;
}>;

const GENRE_IDS: Readonly<Record<string, number>> = {
  Comedy: 35,
  Drama: 18,
};

const toGenre = (name: string): Genre => ({
  id: GENRE_IDS[name] ?? 99,
  name,
  slug: slugify(name),
});

const HULU = { id: 453, logo: 'ep_logo_hulu.png', name: 'Hulu' } as const;

const DISNEY: WatchProvider = {
  color: '#0b2a5b',
  id: 337,
  logo: img('ep_prov_disney.png'),
  logoPath: imgPath('ep_prov_disney.png'),
  name: 'Disney+',
};

export const toEpisode = (raw: StubEpisode): Episode => ({
  airDate: isoDate(raw.airDate),
  description:
    raw.overview ??
    `Invented summary of episode ${raw.number}: the crew gets ready for an unusually busy service while an old argument comes back to the table, and nobody can agree on what to cook for the night.`,
  episodeNumber: raw.number,
  hasAired: raw.airDate <= TODAY,
  id: raw.id,
  runtime: raw.runtime,
  seasonNumber: raw.season,
  stillImage: img(raw.still),
  stillPath: imgPath(raw.still),
  title: raw.title,
});

export const seasonNumbers = (show: StubShow): ReadonlyArray<number> =>
  [...new Set(show.episodes.map((episode) => episode.season))].sort(
    (a, b) => a - b,
  );

export const episodesOf = (
  show: StubShow,
  season: number,
): ReadonlyArray<StubEpisode> =>
  show.episodes.filter((episode) => episode.season === season);

export const findEpisode = (
  show: StubShow,
  season: number,
  episode: number,
): StubEpisode | undefined =>
  show.episodes.find((e) => e.season === season && e.number === episode);

/** Aired regular episodes (specials never count for the show, as in the API). */
export const airedEpisodes = (show: StubShow): ReadonlyArray<StubEpisode> =>
  show.episodes.filter(
    (episode) => episode.season > 0 && episode.airDate <= TODAY,
  );

/** The season as `GET /series/:id/season/:n` answers it. */
export const toSeason = (show: StubShow, season: number): Season | null => {
  const episodes = episodesOf(show, season);
  const first = episodes[0];
  if (!first) {
    return null;
  }
  const aired = episodes.filter((episode) => episode.airDate <= TODAY);
  return {
    airDate: isoDate(first.airDate),
    description: '',
    episodes: episodes.map((episode) => toEpisode(episode)),
    hasAired: first.airDate <= TODAY,
    id: show.id * 100 + season,
    numberOfAiredEpisodes: aired.length,
    numberOfEpisodes: episodes.length,
    seasonNumber: season,
    title: season === 0 ? 'Specials' : `Season ${season}`,
  };
};

const toPerson = (person: RawPerson, show: StubShow): Person => ({
  character: person.role,
  id: person.id,
  image: img(person.img ?? ''),
  job: '',
  knownForDepartment: 'Acting',
  name: person.name,
  numberOfEpisodes: show.episodes.length,
  slug: slugify(person.name),
});

export const toCredits = (
  show: StubShow,
): Readonly<{ cast: ReadonlyArray<Person>; crew: ReadonlyArray<Person> }> => ({
  cast: show.cast.map((person) => toPerson(person, show)),
  crew: show.crew.map((member) => ({
    character: '',
    id: member.id,
    image: '',
    job: member.job,
    name: member.name,
    numberOfEpisodes: show.episodes.length,
    slug: slugify(member.name),
  })),
});

/**
 * TMDB's ids for the stub's keywords that belong to a theme's set (neither
 * is its theme's strongest), so their chips link to the theme as on TMDB
 */
const KEYWORD_IDS: Readonly<Record<string, number>> = {
  'family business': 5683,
  workplace: 6282,
};

export const toKeywords = (show: StubShow): ReadonlyArray<Keyword> =>
  show.keywords.map((name, index) => ({
    id: KEYWORD_IDS[name] ?? 9000 + index,
    name,
  }));

const hashId = (text: string): number =>
  [...text].reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) % 900_000,
    7,
  ) + 100_000;

const splitNames = (names: string): ReadonlyArray<string> =>
  names
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

/** `?view=credits`: guest stars and the episode's crew by job. */
const toEpisodeCredits = (raw: StubEpisode): EpisodeCredits => {
  const crew: EpisodePerson[] = [];
  const jobs = [
    ['Director', raw.crew.director],
    ['Writer', raw.crew.writer],
    ['Director of Photography', raw.crew.dp],
    ['Editor', raw.crew.editor],
  ] as const;
  for (const [job, names] of jobs) {
    for (const name of splitNames(names)) {
      crew.push({ character: '', id: hashId(name), image: '', job, name });
    }
  }
  return {
    crew,
    guestStars: raw.guests.map((guest) => ({
      character: guest.role,
      id: guest.id,
      image: img(guest.img ?? ''),
      job: '',
      name: guest.name,
    })),
  };
};

export const toEpisodeWithCredits = (raw: StubEpisode) => ({
  ...toEpisode(raw),
  credits: toEpisodeCredits(raw),
});

export const toSeasonRatings = (
  show: StubShow,
  season: number,
): SeasonRatings => ({
  ratings: Object.fromEntries(
    episodesOf(show, season).map((episode) => [
      String(episode.number),
      { imdbRating: episode.imdb },
    ]),
  ),
});

export const toRating = (show: StubShow): Rating => ({
  imdbid: show.imdbId,
  source: 'imdb',
  value: show.ratingValue,
  votes: show.ratingVotes,
});

const CONTENT_RATINGS: Readonly<Record<string, string>> = {
  DE: '16',
  GB: '15',
  US: 'TV-MA',
};

export const contentRating = (region: string, show?: StubShow): string | null =>
  (show?.contentRatings ?? CONTENT_RATINGS)[region.toUpperCase()] ?? null;

export const watchProviders = (
  region: string,
  show?: StubShow,
): ReadonlyArray<WatchProvider> => {
  if (show?.noProviders) {
    return [];
  }
  const upper = region.toUpperCase();
  if (upper === 'US') {
    return [
      {
        id: HULU.id,
        logo: img(HULU.logo),
        logoPath: imgPath(HULU.logo),
        name: HULU.name,
      },
      DISNEY,
    ];
  }
  return upper === 'XX' ? [] : [DISNEY];
};

export const DISNEY_PROVIDER = DISNEY;

const miniSeries = (rec: Recommendation): TvSeries => ({
  backdropColor: '#000000',
  countries: [{ code: 'US', name: 'United States' }],
  createdBy: [],
  description: '',
  firstAirDate: isoDate(`${rec.year}-01-01`),
  genres: rec.genres.map(toGenre),
  hasAired: true,
  id: rec.id,
  isAdult: false,
  languages: [{ code: 'en', englishName: 'English', name: 'English' }],
  lastAirDate: isoDate(`${rec.year}-12-01`),
  numberOfAiredEpisodes: 20,
  numberOfEpisodes: 20,
  numberOfSeasons: 2,
  originalLanguage: 'en',
  originalTitle: rec.title,
  popularity: 50,
  posterImage: img(rec.poster),
  posterPath: imgPath(rec.poster),
  releaseYear: rec.year,
  slug: slugify(rec.title),
  status: 'Ended',
  tagline: '',
  title: rec.title,
  type: 'Scripted',
  voteAverage: 8.1,
  voteCount: 5000,
});

export const toRecommendations = (show: StubShow): ReadonlyArray<TvSeries> =>
  show.recommendations.map(miniSeries);

const byAirDate = (a: StubEpisode, b: StubEpisode) =>
  a.airDate.localeCompare(b.airDate);

/**
 * Last and next episode to air, by air date, relative to `TODAY`: the last
 * of the regular seasons, the next of any (a special too, as TMDB does).
 */
const lastAndNext = (show: StubShow) => {
  const aired = show.episodes.filter(
    (episode) => episode.season > 0 && episode.airDate <= TODAY,
  );
  const upcoming = show.episodes
    .filter((episode) => episode.airDate > TODAY)
    .sort(byAirDate);
  return { last: aired.at(-1), next: upcoming[0] };
};

/**
 * `specials` as the API estimates it (`TvSeries.specials`): all aired once the
 * first did, or those before the next one to air when that is a special.
 */
const toSpecials = (show: StubShow, next: StubEpisode | undefined) => {
  const season = toSeason(show, 0);
  if (!season) {
    return undefined;
  }
  const aired =
    next?.season === 0
      ? next.number - 1
      : season.hasAired
        ? (season.numberOfEpisodes ?? 0)
        : 0;
  return { ...season, episodes: [], numberOfAiredEpisodes: aired };
};

export type PreferredPicks = Readonly<{
  backdropColor: string;
  backdropImagePath: string;
  titleTreatment?: 'text';
  titleTreatmentImagePath?: string;
}>;

/** `GET /series/:id`: `seasons` carry counts, not episodes (like TMDB). */
export const toSeries = (
  show: StubShow,
  options: Readonly<{
    includeImages: boolean;
    preferred: PreferredPicks | undefined;
  }>,
): TvSeries => {
  const { last, next } = lastAndNext(show);
  const regular = show.episodes.filter((episode) => episode.season > 0);
  const first = regular[0];
  const aired = airedEpisodes(show).length;
  const specials = toSpecials(show, next);
  const backdropName = options.preferred
    ? options.preferred.backdropImagePath.replace(/^\//, '')
    : show.backdrop;
  const logoName = options.preferred
    ? (options.preferred.titleTreatmentImagePath ?? '').replace(/^\//, '')
    : options.includeImages
      ? show.logo
      : '';
  const seasons = seasonNumbers(show)
    .filter((number) => number > 0)
    .map((number) => {
      const season = toSeason(show, number) as Season;
      return { ...season, episodes: [] };
    });
  const year = first?.airDate.slice(0, 4) ?? '';
  return {
    backdropColor: options.preferred?.backdropColor ?? show.backdropColor,
    backdropImage: img(backdropName),
    backdropPath: imgPath(backdropName),
    countries: [{ code: 'US', name: 'United States' }],
    createdBy: show.creators.map((name, index) => ({
      character: '',
      id: hashId(name) + index,
      image: '',
      job: 'Creator',
      name,
      numberOfEpisodes: regular.length,
      slug: slugify(name),
    })),
    description: show.overview,
    externalIds: { imdbId: show.imdbId },
    firstAirDate: isoDate(first?.airDate ?? TODAY),
    genres: show.genres.map(toGenre),
    hasAired: (first?.airDate ?? TODAY) <= TODAY,
    id: show.id,
    isAdult: false,
    languages: [{ code: 'en', englishName: 'English', name: 'English' }],
    lastAirDate: isoDate(show.lastAirDate),
    lastEpisodeToAir: last ? toEpisode(last) : null,
    network: show.network ?? {
      id: HULU.id,
      logo: img(HULU.logo),
      name: HULU.name,
    },
    nextEpisodeToAir: next ? toEpisode(next) : null,
    numberOfAiredEpisodes: aired,
    numberOfEpisodes: regular.length,
    numberOfSeasons: seasons.length,
    originalLanguage: 'en',
    originalTitle: show.originalTitle,
    originCountry: { code: 'US', name: 'United States' },
    popularity: 120,
    posterImage: img(show.poster),
    posterPath: imgPath(show.poster),
    releaseYear: year,
    seasons,
    slug: show.slug,
    ...(specials && { specials }),
    status: show.status,
    tagline: show.tagline,
    title: show.title,
    ...(logoName && { titleTreatmentImage: img(logoName) }),
    type: 'Scripted',
    voteAverage: show.ratingValue,
    voteCount: show.ratingVotes,
    website: `https://www.hulu.com/series/${show.slug}`,
  };
};

/**
 * `GET /series/:id/images`: text-free backdrops and logos for the admin, in
 * TMDB's vote order, with measured page colours as
 * the API serves them (its `groundColor` rule darkens the light ones).
 */
const BACKDROP_CHOICES: ReadonlyArray<readonly [name: string, colour: string]> =
  [
    ['ep_bear_bd.jpg', '#29251f'],
    ['ad_bd_wHNw.jpg', '#383848'],
    ['ad_bd_ety3.jpg', '#182858'],
    ['ad_bd_hXDd.jpg', '#41464b'],
    ['ad_bd_AjdE.jpg', '#182858'],
    ['ad_bd_rSPI.jpg', '#563f34'],
    ['ad_bd_kcQE.jpg', '#082868'],
    ['ad_bd_csnJ.jpg', '#083888'],
    ['ad_bd_5qH5.jpg', '#081828'],
    ['ad_bd_yWoN.jpg', '#46462d'],
    ['ad_bd_oOmQ.jpg', '#41464b'],
    ['ad_bd_lodX.jpg', '#181818'],
    ['ad_bd_e6tP.jpg', '#464620'],
    ['ad_bd_155D.jpg', '#281818'],
    ['ad_bd_hFk4.jpg', '#082868'],
    ['ad_bd_enWn.jpg', '#53462d'],
    ['ad_bd_1dt4.jpg', '#364564'],
    ['ad_bd_rfYl.jpg', '#282838'],
    ['ad_bd_hEhG.jpg', '#3d484d'],
    ['ad_bd_g0v0.jpg', '#082868'],
    ['ad_bd_vfbR.jpg', '#3e482b'],
    ['ad_bd_aygh.jpg', '#46462d'],
    ['ad_bd_8GuO.jpg', '#281818'],
    ['ad_bd_tv70.jpg', '#483828'],
  ];

const LOGO_CHOICES: ReadonlyArray<
  readonly [name: string, width: number, height: number]
> = [
  ['ep_bear_logo.png', 4318, 678],
  ['ad_logo_6v2i.png', 4318, 678],
  ['ad_logo_jcGd.png', 1464, 226],
  ['ad_logo_8TJY.png', 1391, 319],
  ['ad_logo_tupg.png', 4318, 989],
  ['ad_logo_hFYv.png', 1464, 358],
  ['ad_logo_tg2c.png', 3939, 1300],
  ['ad_logo_A9Yi.png', 3939, 609],
];

/** The page colour for a backdrop name, if it is one of the choices. */
export const boardColourFor = (name: string): string | undefined =>
  BACKDROP_CHOICES.find(([choice]) => choice === name)?.[1];

export type ImagesVariant = 'normal' | 'nologo' | 'one';

/** `STUB_API_IMAGES=nologo` drops the logos, `one` also keeps one backdrop. */
export const toImages = (
  preferred: PreferredPicks | undefined,
  variant: ImagesVariant = (process.env.STUB_API_IMAGES as
    | ImagesVariant
    | undefined) ?? 'normal',
) => {
  const backdrops =
    variant === 'one' ? BACKDROP_CHOICES.slice(0, 1) : BACKDROP_CHOICES;
  const logos = variant === 'normal' ? LOGO_CHOICES : [];
  return {
    automatic: {
      backdropPath: backdrops[0] ? imgPath(backdrops[0][0]) : null,
      titleTreatmentPath: logos[0] ? imgPath(logos[0][0]) : null,
    },
    backdrops: backdrops.map(([name]) => ({
      path: imgPath(name),
      url: img(name),
    })),
    preferred: preferred ?? null,
    titleTreatment: logos.map(([name, width, height]) => ({
      height,
      language: 'en',
      path: imgPath(name),
      url: img(name),
      width,
    })),
  };
};

// --- The shows ---------------------------------------------------------

const BEAR_FIRST_EPISODE_ID = 3_000_000;

const bearEpisodes = (): ReadonlyArray<StubEpisode> =>
  BEAR_EPISODES.map((episode, index) => ({
    ...episode,
    id: BEAR_FIRST_EPISODE_ID + index,
  }));

/** Season 5 airing weekly: E1 on Fri 23 Oct 2026, E4 (next) on Fri 13 Nov. */
const AIRING_SEASON_5_START = '2026-10-23';

const airingEpisodes = (): ReadonlyArray<StubEpisode> =>
  bearEpisodes().map((episode) =>
    episode.season === 5
      ? {
          ...episode,
          airDate: addDays(AIRING_SEASON_5_START, (episode.number - 1) * 7),
        }
      : episode,
  );

const BEAR_CREW = [
  { id: 1_100_001, job: 'Creator', name: 'Christopher Storer' },
  { id: 1_100_002, job: 'Executive Producer', name: 'Joanna Calo' },
  { id: 1_100_003, job: 'Executive Producer', name: 'Josh Senior' },
  { id: 1_100_004, job: 'Executive Producer', name: 'Hiro Murai' },
  { id: 1_100_005, job: 'Original Music Composer', name: 'Jeff Russo' },
] as const;

const BEAR_KEYWORDS = [
  'chicago, illinois',
  'restaurant',
  'group therapy',
  'family business',
  'community',
  'workplace',
  'grief',
  'food industry',
  'chef',
  'death of brother',
  'small business',
  'culinary arts',
  'fine dining',
  'panic attack',
  'chosen family',
  'drama',
];

const BEAR_RECOMMENDATIONS: ReadonlyArray<Recommendation> = [
  {
    genres: ['Drama'],
    id: 76331,
    poster: 'ep_rec_succession.jpg',
    title: 'Succession',
    year: '2018',
  },
  {
    genres: ['Drama', 'Comedy'],
    id: 34307,
    poster: 'ep_rec_shameless.jpg',
    title: 'Shameless',
    year: '2011',
  },
  {
    genres: ['Drama'],
    id: 2024,
    poster: 'ep_rec_sixfeet.jpg',
    title: 'Six Feet Under',
    year: '2001',
  },
  {
    genres: ['Comedy', 'Drama'],
    id: 94709,
    poster: 'ep_rec_afterlife.jpg',
    title: 'After Life',
    year: '2019',
  },
  {
    genres: ['Comedy', 'Drama'],
    id: 196_322,
    poster: 'ds_shrinking_p.jpg',
    title: 'Shrinking',
    year: '2023',
  },
  {
    genres: ['Drama'],
    id: 241_259,
    poster: 'ds_babyreindeer_p.jpg',
    title: 'Baby Reindeer',
    year: '2024',
  },
  {
    genres: ['Comedy', 'Drama'],
    id: 154_523,
    poster: 'ds_badsisters_p.jpg',
    title: 'Bad Sisters',
    year: '2022',
  },
  {
    genres: ['Drama'],
    id: 250_000,
    poster: 'ds_eric_p.jpg',
    title: 'Eric',
    year: '2024',
  },
];

const BEAR_OVERVIEW = 'A made-up kitchen drama about a family sandwich shop.';

const bearBase = {
  backdrop: 'ep_bear_bd.jpg',
  backdropColor: '#29251f',
  cast: [
    ...BEAR_REGULARS,
    ...[
      ...new Map(
        BEAR_EPISODES.flatMap((episode) => episode.guests)
          .filter((guest) => guest.img)
          .map((guest) => [guest.id, guest] as const),
      ).values(),
    ].filter(
      (guest) => !BEAR_REGULARS.some((regular) => regular.id === guest.id),
    ),
  ],
  creators: ['Christopher Storer'],
  crew: BEAR_CREW,
  genres: ['Drama', 'Comedy'],
  imdbId: 'tt14452776',
  keywords: BEAR_KEYWORDS,
  logo: 'ep_bear_logo.png',
  originalTitle: 'The Bear',
  overview: BEAR_OVERVIEW,
  poster: 'ep_bear_bd.jpg',
  ratingValue: 8.5,
  ratingVotes: 330_000,
  recommendations: BEAR_RECOMMENDATIONS,
  slug: 'the-bear',
  tagline: 'A made-up tagline.',
  title: 'The Bear',
} as const;

// A made-up long-runner: one season of 200 episodes among 14.
const LONG_SEASON_SIZES = [
  10, 10, 10, 10, 10, 10, 200, 10, 10, 10, 10, 10, 10, 10,
];

// A made-up daily-ish show: 24 seasons of 50 = 1,200 aired episodes.
const HUGE_SEASON_SIZES = Array.from({ length: 24 }, () => 50);

const STILL_NAMES = [
  ...Array.from({ length: 8 }, (_, i) => `ep_s1e${i + 1}.jpg`),
  ...Array.from({ length: 10 }, (_, i) => `ep_s2e${i + 1}.jpg`),
];

const SYNTHETIC_FACES: ReadonlyArray<RawPerson> = [
  {
    id: 910_001,
    img: 'ep_p_curtis.jpg',
    name: 'Marguerite Voss',
    role: 'Judge Halloran',
  },
  {
    id: 910_002,
    img: 'ep_p_odenkirk.jpg',
    name: 'Desmond Ayers',
    role: 'Frank Mercer',
  },
  {
    id: 910_003,
    img: 'ep_p_paulson.jpg',
    name: 'Ines Calloway',
    role: 'Dr. Ruth Okafor',
  },
  {
    id: 910_004,
    img: 'ep_p_platt.jpg',
    name: 'Walter Pruitt',
    role: 'Gus Delaney',
  },
  {
    id: 910_005,
    img: 'ep_p_colman.jpg',
    name: 'Philippa Moore',
    role: 'Aunt Hester',
  },
  { id: 910_006, img: 'ep_p_mulaney.jpg', name: 'Theo Branson', role: 'Eddie' },
];

const syntheticEpisodes = (
  showId: number,
  sizes: ReadonlyArray<number>,
  startDate: string,
): ReadonlyArray<StubEpisode> => {
  const episodes: StubEpisode[] = [];
  let index = 0;
  for (const [seasonIndex, size] of sizes.entries()) {
    for (let number = 1; number <= size; number += 1) {
      episodes.push({
        airDate: addDays(startDate, index * 7),
        crew: {
          director: 'Priya Natarajan',
          dp: 'Tomas Lindqvist',
          editor: 'Alma Reyes',
          writer: 'Jonah Whitcombe',
        },
        guests: [],
        id: showId * 10_000 + (seasonIndex + 1) * 1000 + number,
        imdb: Math.round((7 + ((index * 7) % 25) / 10) * 10) / 10,
        number,
        runtime: 22 + ((index * 5) % 24),
        season: seasonIndex + 1,
        still: STILL_NAMES[index % STILL_NAMES.length] ?? '',
        title: `Episode ${number}`,
      });
      index += 1;
    }
  }
  return episodes;
};

const syntheticBase = {
  backdropColor: '#1d2733',
  cast: SYNTHETIC_FACES,
  creators: ['Priya Natarajan'],
  crew: [{ id: 1_200_001, job: 'Creator', name: 'Priya Natarajan' }],
  genres: ['Drama'],
  keywords: ['family', 'small town', 'ensemble cast'],
  logo: '',
  recommendations: BEAR_RECOMMENDATIONS.slice(0, 4),
} as const;

/** A small show on id 1396, which `e2e/routes.spec.ts` opens. */
const buildBreakingBad = (): StubShow => {
  const episodes = syntheticEpisodes(1396, [7, 13, 13, 13, 16], '2008-01-20');
  return {
    ...syntheticBase,
    backdrop: 'ds_breakingbad_bd.jpg',
    episodes,
    id: 1396,
    imdbId: 'tt0903747',
    lastAirDate: episodes.at(-1)?.airDate ?? TODAY,
    originalTitle: 'Breaking Bad',
    overview: 'A made-up crime drama.',
    poster: 'ds_breakingbad_p.jpg',
    ratingValue: 9.5,
    ratingVotes: 2_100_000,
    slug: 'breaking-bad',
    status: 'Ended',
    tagline: 'Another made-up tagline.',
    title: 'Breaking Bad',
  };
};

/** Three seasons, a three-line overview and twelve keywords: the median show. */
const buildTypical = (): StubShow => {
  const episodes = syntheticEpisodes(
    SHOW_IDS.typical,
    [8, 10, 10],
    '2021-03-05',
  );
  return {
    ...syntheticBase,
    backdrop: 'ds_wire_bd.jpg',
    // ten faces, as a median show has (the cast placeholder draws ten)
    cast: [
      ...SYNTHETIC_FACES,
      ...SYNTHETIC_FACES.map((person) => ({
        ...person,
        id: person.id + 100,
        name: `${person.name} Jr.`,
      })),
    ],
    episodes,
    id: SHOW_IDS.typical,
    imdbId: 'tt9000004',
    keywords: [
      'harbour town',
      'family business',
      'small town',
      'ensemble cast',
      'workplace',
      'restaurant',
      'rivalry',
      'secrets',
      'coming of age',
      'night shift',
      'ferry',
      'inheritance',
    ],
    lastAirDate: episodes.at(-1)?.airDate ?? TODAY,
    originalTitle: 'Harbour Lights',
    overview:
      'A made-up drama about the families who run a ferry crossing and the café beside it. When the last boat of the season is cancelled, old secrets surface and a stranger arrives.',
    poster: 'ds_wire_p.jpg',
    ratingValue: 8.1,
    ratingVotes: 52_000,
    slug: 'harbour-lights',
    status: 'Ended',
    tagline: 'Every crossing costs something.',
    title: 'Harbour Lights',
  };
};

/** Six episodes from Sun 15 Nov 2026 (after "today"), none with a still. */
const buildUnreleased = (): StubShow => {
  const episodes = syntheticEpisodes(
    SHOW_IDS.unreleased,
    [6],
    '2026-11-15',
  ).map((episode) => ({ ...episode, still: '' }));
  return {
    ...buildTypical(),
    episodes,
    id: SHOW_IDS.unreleased,
    imdbId: 'tt9000005',
    lastAirDate: episodes.at(-1)?.airDate ?? TODAY,
    originalTitle: 'Before the Premiere',
    slug: 'before-the-premiere',
    status: 'Returning Series',
    title: 'Before the Premiere',
  };
};

/** Specials as TMDB numbers them: season 0, after the regular episodes. */
const SPECIALS: ReadonlyArray<
  Readonly<{ airDate: string; runtime: number; title: string }>
> = [
  { airDate: '2022-12-24', runtime: 62, title: 'Christmas at the Harbour' },
  { airDate: '2023-12-24', runtime: 75, title: 'The Longest Night' },
  // after "today": announced, not out yet
  { airDate: '2026-12-24', runtime: 70, title: 'A Winter Crossing' },
];

/** Two seasons and three specials (the last one not out yet). */
const buildSpecials = (): StubShow => {
  const regular = syntheticEpisodes(SHOW_IDS.specials, [6, 8], '2022-01-07');
  const specials = SPECIALS.map(
    (special, index): StubEpisode => ({
      ...(regular[index] as StubEpisode),
      airDate: special.airDate,
      id: SHOW_IDS.specials * 10_000 + index + 1,
      number: index + 1,
      runtime: special.runtime,
      season: 0,
      still: STILL_NAMES[(index + 2) % STILL_NAMES.length] ?? '',
      title: special.title,
    }),
  );
  return {
    ...buildTypical(),
    episodes: [...regular, ...specials],
    id: SHOW_IDS.specials,
    imdbId: 'tt9000006',
    lastAirDate: regular.at(-1)?.airDate ?? TODAY,
    // a network whose logo is a filled block: the Information block draws
    // it on a light chip
    network: {
      id: 2,
      logo: imageUrl('logo-block', 'ABC'),
      logoSilhouette: false,
      name: 'ABC',
    },
    originalTitle: 'Lantern Bay',
    overview:
      'A made-up drama about a lighthouse keeper’s family and the town that depends on the light, with a special every Christmas.',
    slug: 'lantern-bay',
    title: 'Lantern Bay',
  };
};

const buildShows = (): ReadonlyArray<StubShow> => {
  const longEpisodes = syntheticEpisodes(
    SHOW_IDS.long,
    LONG_SEASON_SIZES,
    '2018-01-05',
  );
  const hugeEpisodes = syntheticEpisodes(
    SHOW_IDS.huge,
    HUGE_SEASON_SIZES,
    '2003-09-05',
  );
  return [
    {
      ...bearBase,
      episodes: bearEpisodes(),
      id: SHOW_IDS.bear,
      lastAirDate: '2026-06-25',
      status: 'Ended',
    },
    {
      ...bearBase,
      episodes: airingEpisodes(),
      id: SHOW_IDS.airing,
      lastAirDate: addDays(AIRING_SEASON_5_START, 8 * 7),
      status: 'Returning Series',
    },
    {
      ...syntheticBase,
      backdrop: 'ds_wire_bd.jpg',
      episodes: longEpisodes,
      id: SHOW_IDS.long,
      imdbId: 'tt9000002',
      lastAirDate: longEpisodes.at(-1)?.airDate ?? TODAY,
      originalTitle: 'The Long Run',
      overview: 'A made-up long-runner with one 200-episode season.',
      poster: 'ds_wire_p.jpg',
      ratingValue: 7.9,
      ratingVotes: 41_000,
      slug: 'the-long-run',
      status: 'Ended',
      tagline: 'Fourteen seasons and counting.',
      title: 'The Long Run',
    },
    {
      ...syntheticBase,
      backdrop: 'ds_sopranos_bd.jpg',
      episodes: hugeEpisodes,
      id: SHOW_IDS.huge,
      imdbId: 'tt9000003',
      lastAirDate: hugeEpisodes.at(-1)?.airDate ?? TODAY,
      originalTitle: 'Evening Edition',
      overview: 'A made-up show with 1,200 aired episodes.',
      poster: 'ds_sopranos_p.jpg',
      ratingValue: 7.2,
      ratingVotes: 9_800,
      slug: 'evening-edition',
      status: 'Ended',
      tagline: 'Tonight, again.',
      title: 'Evening Edition',
    },
  ];
};

/**
 * The Focus wall's composition lab: one-season shows of every size the case table covers, an
 * airing season with episodes still to come, a season without stills and one
 * with very long titles and overviews. Viewer states come from marks a test
 * writes in its own copy of the stub.
 */
export const WALL_LAB_SIZES = [1, 2, 3, 4, 5, 6, 8, 10, 13, 24, 60] as const;

export const wallLabId = (size: number): number => 920_000 + size;

export const WALL_LAB_IDS = {
  /** 8 episodes weekly, E1–E5 out, E6 on 19 Nov. */
  airing: 920_101,
  /** 8 episodes with very long titles and overviews. */
  longText: 920_103,
  /** 6 episodes, no stills and no backdrop; E2 has no synopsis, E3 a one-line one. */
  noStills: 920_102,
} as const;

/** The hero's rating and meta row edge cases. */
export const HERO_LAB_IDS = {
  /** 8.3 from 742 votes. */
  fewVotes: 920_202,
  /** 7.4 with no vote count. */
  noVotes: 920_201,
  /** 10.0 from 1,200 votes. */
  perfect: 920_203,
  /** Seven genres, no age rating, no provider. */
  sparse: 920_205,
  /** No IMDb rating at all. */
  unrated: 920_204,
} as const;

const LONG_TITLE =
  'The Night Everyone Finally Sat Down Together and Talked About the Thing Nobody Mentioned Last Winter';

const LONG_OVERVIEW =
  'An invented, deliberately long overview: the harbour floods on the first night of the festival, the ferry is stuck on the far side with half the town aboard, the café runs out of everything but coffee, and three old friends who have not spoken in eleven years end up sharing one table, one candle and one very long story about the summer the lighthouse went dark and what each of them did that night.';

const labShow = (
  id: number,
  title: string,
  episodes: ReadonlyArray<StubEpisode>,
  extra: Partial<StubShow> = {},
): StubShow => ({
  ...syntheticBase,
  backdrop: 'ds_wire_bd.jpg',
  episodes,
  id,
  imdbId: `tt${id}`,
  lastAirDate: episodes.at(-1)?.airDate ?? TODAY,
  originalTitle: title,
  overview: 'A made-up limited series for the episode wall checks.',
  poster: 'ds_wire_p.jpg',
  ratingValue: 8.1,
  ratingVotes: 321_400,
  slug: slugify(title),
  status: 'Ended',
  tagline: '',
  title,
  ...extra,
});

const buildWallLab = (): ReadonlyArray<StubShow> => {
  const sized = WALL_LAB_SIZES.map((size) =>
    labShow(
      wallLabId(size),
      `Wall ${size}`,
      syntheticEpisodes(wallLabId(size), [size], '2025-03-13'),
    ),
  );
  const airingStart = addDays(TODAY, -4 * 7);
  const airing = labShow(
    WALL_LAB_IDS.airing,
    'Wall Airing',
    syntheticEpisodes(WALL_LAB_IDS.airing, [8], airingStart),
    { status: 'Returning Series' },
  );
  const noStills = labShow(
    WALL_LAB_IDS.noStills,
    'Wall No Stills',
    syntheticEpisodes(WALL_LAB_IDS.noStills, [6], '2025-03-13').map(
      (episode) => ({
        ...episode,
        // E2 without a synopsis either (the tile's shortest body), E3 with
        // a one-line one
        ...(episode.number === 2 && { overview: '' }),
        ...(episode.number === 3 && { overview: 'A short one.' }),
        still: '',
      }),
    ),
    { backdrop: '' },
  );
  const longText = labShow(
    WALL_LAB_IDS.longText,
    'Wall Long Text',
    syntheticEpisodes(WALL_LAB_IDS.longText, [8], '2025-03-13').map(
      (episode) => ({
        ...episode,
        overview: LONG_OVERVIEW,
        title: `${LONG_TITLE} (Part ${episode.number})`,
      }),
    ),
  );
  return [...sized, airing, noStills, longText];
};

const buildHeroLab = (): ReadonlyArray<StubShow> => {
  const episodes = (id: number) => syntheticEpisodes(id, [6], '2024-09-05');
  return [
    labShow(
      HERO_LAB_IDS.noVotes,
      'Hero No Votes',
      episodes(HERO_LAB_IDS.noVotes),
      {
        ratingValue: 7.4,
        ratingVotes: 0,
      },
    ),
    labShow(
      HERO_LAB_IDS.fewVotes,
      'Hero Few Votes',
      episodes(HERO_LAB_IDS.fewVotes),
      { ratingValue: 8.3, ratingVotes: 742 },
    ),
    labShow(
      HERO_LAB_IDS.perfect,
      'Hero Perfect',
      episodes(HERO_LAB_IDS.perfect),
      {
        ratingValue: 10,
        ratingVotes: 1_200,
      },
    ),
    labShow(
      HERO_LAB_IDS.unrated,
      'Hero Unrated',
      episodes(HERO_LAB_IDS.unrated),
      {
        ratingValue: 0,
        ratingVotes: 0,
      },
    ),
    labShow(HERO_LAB_IDS.sparse, 'Hero Sparse', episodes(HERO_LAB_IDS.sparse), {
      contentRatings: {},
      genres: [
        'Drama',
        'Crime',
        'Mystery',
        'Thriller',
        'Science Fiction & Fantasy',
        'Action & Adventure',
        'War & Politics',
      ],
      noProviders: true,
    }),
  ];
};

const SHOWS = [
  ...buildShows(),
  buildBreakingBad(),
  buildTypical(),
  buildUnreleased(),
  buildSpecials(),
  ...buildWallLab(),
  ...buildHeroLab(),
];

export const findShow = (id: number): StubShow | undefined =>
  SHOWS.find((show) => show.id === id);

export const allShows = (): ReadonlyArray<StubShow> => SHOWS;

/**
 * A show of the Discover catalogue as a markable show (the "Seen it" pill on a
 * landing tile): its seasons of a few episodes, all aired. Only the marking
 * routes use it; the series routes of these shows stay the Discover fixture's.
 */
export const catalogueShow = (id: number): StubShow | undefined => {
  const entry = CATALOGUE.find((show) => catalogueId(show) === id);
  return entry
    ? syntheticShow({
        id,
        originalTitle: entry.originalTitle,
        poster: '',
        ratingValue: entry.vote / 10,
        ratingVotes: Math.round(entry.votesK * 1000),
        sizes: seasonSizes(entry),
        slug: slugify(entry.title),
        startDate: `${entry.year}-01-15`,
        status: 'Ended',
        title: entry.title,
      })
    : undefined;
};

/**
 * A markable show built from its season sizes, one episode a week from
 * `startDate` (the catalogue's and the profile's shows, for the marking
 * routes).
 */
export const syntheticShow = (
  show: Pick<
    StubShow,
    | 'id'
    | 'originalTitle'
    | 'poster'
    | 'ratingValue'
    | 'ratingVotes'
    | 'slug'
    | 'status'
    | 'title'
  > &
    Readonly<{ sizes: ReadonlyArray<number>; startDate: string }>,
): StubShow => {
  const { sizes, startDate, ...rest } = show;
  const episodes = syntheticEpisodes(show.id, sizes, startDate);
  return {
    ...syntheticBase,
    ...rest,
    backdrop: '',
    episodes,
    imdbId: '',
    lastAirDate: episodes.at(-1)?.airDate ?? TODAY,
    overview: '',
    tagline: '',
  };
};
