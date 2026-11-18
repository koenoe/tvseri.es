import { NETWORKS } from './networks';
import { THEMES, type Theme } from './themes';

/**
 * Slugs and ids for the Discover landings:
 * `/genre/{slug}`, `/theme/{slug}`, `/network/{slug}`, `/country/{iso2}`,
 * `/decade/{yyyy}s`, `/language/{code}`.
 */
export const LANDING_TYPES = [
  'genre',
  'theme',
  'network',
  'country',
  'decade',
  'language',
] as const;

export type LandingType = (typeof LANDING_TYPES)[number];

/** TMDB discover params that select a landing's shows */
export type LandingFilter = Readonly<Record<string, string>>;

/**
 * A genre landing: one of TMDB's TV genres, or a genre TMDB only has as a
 * keyword (its TV genre list has no Horror, Thriller or Romance, and its
 * contributor rules ask for them as keywords). The name is TMDB's.
 */
type Genre = Readonly<
  { name: string } & (
    | { kind: 'genre'; id: number }
    | { kind: 'keyword'; keywordId: number }
  )
>;

const tmdbGenre = (id: number, name: string): Genre => ({
  id,
  kind: 'genre',
  name,
});
const keywordGenre = (keywordId: number, name: string): Genre => ({
  keywordId,
  kind: 'keyword',
  name,
});

/** Genre landings by slug: the one source of a TMDB genre's slug (`landingSlugForId`) */
const GENRES: Readonly<Record<string, Genre>> = {
  'action-adventure': tmdbGenre(10759, 'Action & Adventure'),
  animation: tmdbGenre(16, 'Animation'),
  comedy: tmdbGenre(35, 'Comedy'),
  crime: tmdbGenre(80, 'Crime'),
  documentary: tmdbGenre(99, 'Documentary'),
  drama: tmdbGenre(18, 'Drama'),
  family: tmdbGenre(10751, 'Family'),
  horror: keywordGenre(315058, 'Horror'),
  kids: tmdbGenre(10762, 'Kids'),
  mystery: tmdbGenre(9648, 'Mystery'),
  news: tmdbGenre(10763, 'News'),
  reality: tmdbGenre(10764, 'Reality'),
  romance: keywordGenre(9840, 'Romance'),
  'sci-fi-fantasy': tmdbGenre(10765, 'Sci-Fi & Fantasy'),
  soap: tmdbGenre(10766, 'Soap'),
  talk: tmdbGenre(10767, 'Talk'),
  thriller: keywordGenre(316362, 'Thriller'),
  'war-politics': tmdbGenre(10768, 'War & Politics'),
  western: tmdbGenre(37, 'Western'),
};

/** Decades with a landing: 1940s to 2020s */
const FIRST_DECADE = 1940;
const LAST_DECADE = 2020;

/** ISO 3166-1 alpha-2 */
const COUNTRIES: ReadonlySet<string> = new Set(
  `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP
KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT
MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW
SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG
UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(/\s+/),
);

/** ISO 639-1, plus TMDB's `cn` (Cantonese) */
const LANGUAGES: ReadonlySet<string> = new Set(
  `aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo
es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki
kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr
nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th
ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu cn`.split(
    /\s+/,
  ),
);

/**
 * A table's own entry for a slug: never one inherited from `Object.prototype`
 * (`constructor`, `__proto__`, `toString`...)
 */
const ownEntry = <T>(
  table: Readonly<Record<string, T>>,
  slug: string,
): T | undefined => (Object.hasOwn(table, slug) ? table[slug] : undefined);

/** A theme by its slug: name, group, keyword ids (strongest first), required genre */
export const themeBySlug = (slug: string): Theme | undefined =>
  ownEntry(THEMES, slug);

/** A genre landing's name by its slug ("Sci-Fi & Fantasy", "Horror") */
export const genreName = (slug: string): string | undefined =>
  ownEntry(GENRES, slug)?.name;

/** TMDB genre ids to their landing; the keyword genres have no genre id */
const GENRE_SLUG_BY_ID = new Map(
  Object.entries(GENRES).flatMap(([slug, genre]) =>
    genre.kind === 'genre' ? [[genre.id, slug] as const] : [],
  ),
);
/** Every keyword of every theme to its theme (a keyword is in one theme at most) */
const THEME_SLUG_BY_ID = new Map(
  Object.entries(THEMES).flatMap(([slug, theme]) =>
    theme.keywordIds.map((id) => [id, slug] as const),
  ),
);
const KEYWORD_GENRE_SLUG_BY_ID = new Map(
  Object.entries(GENRES).flatMap(([slug, genre]) =>
    genre.kind === 'keyword' ? [[genre.keywordId, slug] as const] : [],
  ),
);

const NETWORK_BY_SLUG = new Map(
  NETWORKS.map((network) => [network.slug, network]),
);
const NETWORK_BY_ID = new Map(NETWORKS.map((network) => [network.id, network]));

/** Looks a network up by its TMDB id (to add its slug and line to `/network/:id`) */
export const networkById = (id: number) => NETWORK_BY_ID.get(id);

/** Looks a network up by its landing slug (`/network/{slug}`) */
export const networkBySlug = (slug: string) => NETWORK_BY_SLUG.get(slug);

const DECADE_SLUG = /^(\d{4})s$/;

const decadeStart = (slug: string) => {
  const match = DECADE_SLUG.exec(slug);
  if (!match) {
    return undefined;
  }
  const start = Number(match[1]);
  return start % 10 === 0 && start >= FIRST_DECADE && start <= LAST_DECADE
    ? start
    : undefined;
};

const DECADE_SLUGS = Array.from(
  { length: (LAST_DECADE - FIRST_DECADE) / 10 + 1 },
  (_, i) => `${FIRST_DECADE + i * 10}s`,
);

/**
 * Every slug with a landing, per type, in the case its URL uses (lower case).
 * Plain strings, so `next.config.ts` can build its static 404 rewrites from
 * them in plain Node.
 */
export const LANDING_SLUGS: Readonly<
  Record<LandingType, ReadonlyArray<string>>
> = {
  country: [...COUNTRIES].map((code) => code.toLowerCase()),
  decade: DECADE_SLUGS,
  genre: Object.keys(GENRES),
  language: [...LANGUAGES],
  network: NETWORKS.map((network) => network.slug),
  theme: Object.keys(THEMES),
};

/** The discover filter for a landing, or undefined when the slug isn't one */
export const landingFilter = (
  type: LandingType,
  slug: string,
): LandingFilter | undefined => {
  switch (type) {
    case 'genre': {
      const genre = ownEntry(GENRES, slug);
      if (!genre) {
        return undefined;
      }
      return genre.kind === 'genre'
        ? { with_genres: String(genre.id) }
        : { with_keywords: String(genre.keywordId) };
    }
    case 'theme': {
      const theme = ownEntry(THEMES, slug);
      if (!theme) {
        return undefined;
      }
      // `|` is TMDB's OR: a show with any of the theme's keywords
      const keywords = { with_keywords: theme.keywordIds.join('|') };
      return theme.genreId === undefined
        ? keywords
        : { ...keywords, with_genres: String(theme.genreId) };
    }
    case 'network': {
      const network = NETWORK_BY_SLUG.get(slug);
      return network ? { with_networks: String(network.id) } : undefined;
    }
    case 'country': {
      const code = slug.toUpperCase();
      return COUNTRIES.has(code) ? { with_origin_country: code } : undefined;
    }
    case 'language': {
      return LANGUAGES.has(slug) ? { with_original_language: slug } : undefined;
    }
    case 'decade': {
      const start = decadeStart(slug);
      return start === undefined
        ? undefined
        : {
            'first_air_date.gte': `${start}-01-01`,
            'first_air_date.lte': `${start + 9}-12-31`,
          };
    }
  }
};

/**
 * The slug of a TMDB genre, keyword or network id (the reverse of
 * `landingFilter`). Any keyword of a theme's set finds the theme.
 */
export const landingSlugForId = (
  type: 'genre' | 'theme' | 'network',
  id: number,
): string | undefined => {
  switch (type) {
    case 'genre':
      return GENRE_SLUG_BY_ID.get(id);
    case 'theme':
      return THEME_SLUG_BY_ID.get(id);
    case 'network':
      return NETWORK_BY_ID.get(id)?.slug;
  }
};

/**
 * The landing a TMDB keyword leads to: its theme, or the genre TMDB only has
 * as a keyword (`horror`); undefined when it has none.
 */
export const keywordLanding = (
  id: number,
): Readonly<{ type: 'genre' | 'theme'; slug: string }> | undefined => {
  const theme = THEME_SLUG_BY_ID.get(id);
  if (theme) {
    return { slug: theme, type: 'theme' };
  }
  const genre = KEYWORD_GENRE_SLUG_BY_ID.get(id);
  return genre ? { slug: genre, type: 'genre' } : undefined;
};

/** A filter's strongest keyword: the first of its set (sets list it first) */
const strongestKeyword = (filter: LandingFilter): string | undefined =>
  filter.with_keywords?.split('|')[0];

/**
 * The shows that pass every filter (AND). Genres join with `,`, once each.
 * TMDB documents a list as all `,` (AND) or all `|` (OR), never both, so when
 * more than one filter has keywords each one adds only its strongest keyword
 * (`allOf(dystopia, time travel)` is `4565,4379`); a lone keyword set stays
 * whole. Any other key: the last filter's value.
 */
export const allOf = (
  ...filters: ReadonlyArray<LandingFilter>
): LandingFilter => {
  const genres = [
    ...new Set(filters.flatMap((filter) => filter.with_genres ?? [])),
  ];
  const keyworded = filters.filter((filter) => filter.with_keywords);
  const keywords =
    keyworded.length > 1
      ? keyworded.map(strongestKeyword).join(',')
      : keyworded[0]?.with_keywords;
  return {
    ...Object.assign({}, ...filters),
    ...(genres.length > 0 ? { with_genres: genres.join(',') } : {}),
    ...(keywords ? { with_keywords: keywords } : {}),
  };
};

/**
 * `filter`'s shows without `other`'s, by `other`'s strongest keyword (one
 * keyword: how TMDB reads a list in `without_keywords` is not documented).
 */
export const excluding = (
  filter: LandingFilter,
  other: LandingFilter,
): LandingFilter => {
  const without = strongestKeyword(other);
  return without ? { ...filter, without_keywords: without } : filter;
};

/** A plain id (not a list like `80,18`) */
const plainId = (value: string) =>
  /^\d+$/.test(value) ? Number(value) : undefined;

const idPath = (type: 'genre' | 'network', value: string) => {
  const id = plainId(value);
  const slug = id === undefined ? undefined : landingSlugForId(type, id);
  return slug ? `/${type}/${slug}` : undefined;
};

/**
 * Every filter key the old filter grid could put in a `/discover` link (the
 * keys of `DiscoverQuerySchema`; a web test keeps them equal). Plain strings
 * here, because `next.config.ts` loads them in plain Node, where the schemas
 * barrel can't load.
 */
export const DISCOVER_FILTER_KEYS = [
  'air_date.gte',
  'air_date.lte',
  'first_air_date.gte',
  'first_air_date.lte',
  'sort_by',
  'vote_average.gte',
  'vote_average.lte',
  'vote_count.gte',
  'vote_count.lte',
  'watch_region',
  'with_genres',
  'with_keywords',
  'with_networks',
  'with_origin_country',
  'with_original_language',
  'with_runtime.gte',
  'with_runtime.lte',
  'with_status',
  'with_type',
  'with_watch_providers',
  'without_genres',
  'without_keywords',
] as const;

/** Filter keys that pick a landing, and the landing's path for a value */
const LANDING_FOR_KEY: ReadonlyMap<
  string,
  (value: string) => string | undefined
> = new Map<string, (value: string) => string | undefined>([
  ['with_genres', (value) => idPath('genre', value)],
  [
    'with_keywords',
    (value) => {
      const id = plainId(value);
      const landing = id === undefined ? undefined : keywordLanding(id);
      return landing ? `/${landing.type}/${landing.slug}` : undefined;
    },
  ],
  ['with_networks', (value) => idPath('network', value)],
  [
    'with_origin_country',
    (value) =>
      COUNTRIES.has(value) ? `/country/${value.toLowerCase()}` : undefined,
  ],
  [
    'with_original_language',
    (value) => (LANGUAGES.has(value) ? `/language/${value}` : undefined),
  ],
]);

const DECADE_KEYS = ['first_air_date.gte', 'first_air_date.lte'];

/**
 * The filter keys that decide which shows a landing holds. Sort order and
 * region don't; any other key (paging, `utm_*`, `fbclid`, `gclid`...) isn't a
 * filter at all.
 */
const FILTER_KEYS: ReadonlySet<string> = new Set(
  DISCOVER_FILTER_KEYS.filter(
    (key) => key !== 'sort_by' && key !== 'watch_region',
  ),
);

const decadePath = (from: string, to: string) => {
  const slug = `${from.slice(0, 4)}s`;
  const filter = landingFilter('decade', slug);
  return filter?.['first_air_date.gte'] === from &&
    filter['first_air_date.lte'] === to
    ? `/decade/${slug}`
    : undefined;
};

/**
 * Maps an old `/discover?...` query to the landing that shows the same shows.
 * Returns `/discover` (the hub) when it isn't exactly one landing: no filter,
 * several filters, a list or an unknown id (e.g. `with_genres=80,18`), a
 * window that isn't a whole decade, or any filter without a landing
 * (`with_watch_providers`...). Sort order, region and keys that aren't
 * filters (paging, tracking parameters) are ignored.
 */
export const landingPathFromDiscoverQuery = (
  query: Readonly<Record<string, string | undefined>>,
): string => {
  const entries = Object.entries(query).filter(
    (entry): entry is [string, string] =>
      Boolean(entry[1]) && FILTER_KEYS.has(entry[0]),
  );
  const keys = entries.map(([key]) => key);

  if (keys.length === 2 && DECADE_KEYS.every((key) => keys.includes(key))) {
    return (
      decadePath(
        query['first_air_date.gte'] ?? '',
        query['first_air_date.lte'] ?? '',
      ) ?? '/discover'
    );
  }

  const [only] = entries;
  const pathFor =
    only && entries.length === 1 ? LANDING_FOR_KEY.get(only[0]) : undefined;

  return (only && pathFor?.(only[1])) ?? '/discover';
};
