import { landingFilter } from '@tvseri.es/constants';

/**
 * The profile fixtures' shows: the titles the V60–V63 boards draw, with
 * stand-in artwork from the local board image folder (`STUB_ASSETS_URL/img`,
 * empty without it). Invented ids (99xxxx), so `/series/:id` here never
 * answers for another stream's shows.
 */

export const img = (name: string): string =>
  name && process.env.STUB_ASSETS_URL
    ? `${process.env.STUB_ASSETS_URL}/img/${name}`
    : '';

export type ProfileShow = Readonly<{
  id: number;
  title: string;
  slug: string;
  poster: string;
  backdrop: string;
  /** Title treatment (only a few local stand-ins) */
  logo: string;
  /** `/series/:id` facts the blocks draw */
  seasons: number;
  episodes: number;
  status: 'Ended' | 'Returning Series' | 'Canceled';
  type: 'Scripted' | 'Miniseries';
  firstAired: string;
  runtime: number;
  genres: ReadonlyArray<string>;
}>;

export const show = (
  id: number,
  title: string,
  art: Readonly<{ poster: string; backdrop?: string; logo?: string }>,
  facts: Partial<
    Pick<
      ProfileShow,
      | 'seasons'
      | 'episodes'
      | 'status'
      | 'type'
      | 'firstAired'
      | 'runtime'
      | 'genres'
    >
  > = {},
): ProfileShow => ({
  backdrop: img(art.backdrop ?? ''),
  episodes: facts.episodes ?? 10,
  firstAired: facts.firstAired ?? '2022-01-01',
  genres: facts.genres ?? ['Drama'],
  id,
  logo: img(art.logo ?? ''),
  poster: img(art.poster),
  runtime: facts.runtime ?? 50,
  seasons: facts.seasons ?? 1,
  slug: title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, ''),
  status: facts.status ?? 'Returning Series',
  title,
  type: facts.type ?? 'Scripted',
});

export const SHOWS = {
  blackDoves: show(
    990001,
    'Black Doves',
    { backdrop: 'ds_bridge_bd.jpg', poster: 'ds_slowhorses_p.jpg' },
    {
      episodes: 12,
      firstAired: '2024-12-05',
      genres: ['Crime', 'Drama'],
      seasons: 2,
    },
  ),
  dark: show(
    990002,
    'Dark',
    {
      backdrop: 'ds_dark_bd.jpg',
      logo: 'ds_dark_logo.png',
      poster: 'ds_dark_p.jpg',
    },
    {
      episodes: 26,
      firstAired: '2017-12-01',
      genres: ['Crime', 'Mystery'],
      seasons: 3,
      status: 'Ended',
    },
  ),
  dexter: show(
    990003,
    'Dexter: Resurrection',
    {
      backdrop: 'ep_bear_bd.jpg',
      logo: 'ep_bear_logo.png',
      poster: 'ds_penguin_p.jpg',
    },
    {
      episodes: 18,
      firstAired: '2025-07-11',
      genres: ['Crime', 'Drama'],
      runtime: 58,
      seasons: 2,
    },
  ),
  frieren: show(
    990004,
    'Frieren',
    { backdrop: 'ds_edgerunners_bd.jpg', poster: 'ds_edgerunners_p.jpg' },
    {
      episodes: 28,
      firstAired: '2023-09-29',
      genres: ['Animation'],
      seasons: 1,
    },
  ),
  gildedAge: show(
    990005,
    'The Gilded Age',
    { backdrop: 'ds_got_bd.jpg', poster: 'ds_outlander_p.jpg' },
    {
      episodes: 34,
      firstAired: '2022-01-24',
      genres: ['Drama'],
      runtime: 62,
      seasons: 4,
    },
  ),
  haikyu: show(
    990006,
    'Haikyu!!',
    { backdrop: 'ds_onepiece_bd.jpg', poster: 'ds_monster_p.jpg' },
    {
      episodes: 85,
      firstAired: '2014-04-06',
      genres: ['Animation'],
      runtime: 24,
      seasons: 4,
      status: 'Ended',
    },
  ),
  lastOfUs: show(
    990007,
    'The Last of Us',
    { backdrop: 'ds_chernobyl_bd.jpg', poster: 'ds_silo_p.jpg' },
    { episodes: 16, firstAired: '2023-01-15', genres: ['Drama'], seasons: 2 },
  ),
  // real-data shape: a long title, many seasons (sam's page)
  marathon: show(
    990090,
    'The Extraordinarily Long and Winding Chronicles of the Northern Harbour Constabulary: Complete Series',
    { poster: 'ds_dark_p.jpg' },
    { episodes: 140, seasons: 9, status: 'Returning Series' },
  ),
  mcmafia: show(
    990008,
    'McMafia',
    { backdrop: 'ds_narcos_bd.jpg', poster: 'ds_nightmanager_p.jpg' },
    {
      episodes: 8,
      firstAired: '2018-01-01',
      genres: ['Crime', 'Drama'],
      seasons: 1,
      status: 'Ended',
    },
  ),
  midsomer: show(
    990009,
    'Midsomer Murders',
    { backdrop: 'ds_sherlock_bd.jpg', poster: 'ds_deptq_p.jpg' },
    {
      episodes: 140,
      firstAired: '1997-03-23',
      genres: ['Crime', 'Mystery'],
      runtime: 90,
      seasons: 26,
    },
  ),
  mobland: show(
    990010,
    'MobLand',
    { backdrop: 'ds_peaky_bd.jpg', poster: 'ds_peaky_p.jpg' },
    {
      episodes: 10,
      firstAired: '2025-03-30',
      genres: ['Crime', 'Drama'],
      seasons: 1,
    },
  ),
  pitt: show(
    990011,
    'The Pitt',
    { backdrop: 'ds_mare_bd.jpg', poster: 'ds_rookie_p.jpg' },
    { episodes: 30, firstAired: '2025-01-09', genres: ['Drama'], seasons: 2 },
  ),
  ringsOfPower: show(
    990012,
    'The Rings of Power',
    { backdrop: 'ds_avatar_bd.jpg', poster: 'ds_loki_p.jpg' },
    {
      episodes: 16,
      firstAired: '2022-09-01',
      genres: ['Sci-Fi & Fantasy'],
      runtime: 66,
      seasons: 2,
    },
  ),
  severance: show(
    990013,
    'Severance',
    { backdrop: 'ds_office_bd.jpg', poster: 'ds_severance_p.jpg' },
    {
      episodes: 19,
      firstAired: '2022-02-17',
      genres: ['Drama', 'Mystery'],
      seasons: 2,
    },
  ),
  shogun: show(
    990014,
    'Shōgun',
    { backdrop: 'ds_boys_bd.jpg', poster: 'ds_formankind_p.jpg' },
    {
      episodes: 10,
      firstAired: '2024-02-27',
      genres: ['Drama', 'War & Politics'],
      runtime: 58,
      seasons: 1,
    },
  ),
  theChosen: show(
    990015,
    'The Chosen',
    { backdrop: 'ds_wire_bd.jpg', poster: 'ds_wire_p.jpg' },
    {
      episodes: 48,
      firstAired: '2019-04-21',
      genres: ['Drama'],
      runtime: 58,
      seasons: 5,
    },
  ),
  tyson: show(
    990016,
    'TYSON',
    { backdrop: 'ds_breakingbad_bd.jpg', poster: 'ds_breakingbad_p.jpg' },
    {
      episodes: 4,
      firstAired: '2025-10-01',
      genres: ['Documentary'],
      runtime: 60,
      seasons: 1,
      status: 'Ended',
      type: 'Miniseries',
    },
  ),
  wednesday: show(
    990017,
    'Wednesday',
    { backdrop: 'ds_strangerthings_bd.jpg', poster: 'ds_task_p.jpg' },
    {
      episodes: 16,
      firstAired: '2022-11-23',
      genres: ['Comedy', 'Mystery'],
      seasons: 2,
    },
  ),
  whiteLotus: show(
    990018,
    'The White Lotus',
    { backdrop: 'ds_sopranos_bd.jpg', poster: 'ds_sopranos_p.jpg' },
    {
      episodes: 25,
      firstAired: '2021-07-11',
      genres: ['Comedy', 'Drama'],
      seasons: 3,
    },
  ),
  witchHat: show(
    990019,
    'Witch Hat Atelier',
    { backdrop: 'ds_pluribus_bd.jpg', poster: 'ds_pluribus_p.jpg' },
    {
      episodes: 13,
      firstAired: '2026-10-01',
      genres: ['Animation'],
      runtime: 24,
      seasons: 1,
    },
  ),
  xmen: show(
    990020,
    "X-Men '97",
    { backdrop: 'ds_andor_bd.jpg', poster: 'ds_12monkeys_p.jpg' },
    {
      episodes: 20,
      firstAired: '2024-03-20',
      genres: ['Animation', 'Action & Adventure'],
      runtime: 35,
      seasons: 2,
    },
  ),
} as const;

/**
 * A long tail of invented shows with realistic, sometimes very long titles,
 * so a list fills a whole first page (20) and a lane of ten tiles wraps like
 * real data does. Ids 991001 and up; the art is borrowed from the shows above.
 */
const BULK_TITLES = [
  'The Extraordinarily Long Winter of the Lighthouse Keepers of Northern Scotland',
  'Marlowe',
  'Detectorists: The Complete Collection of Small Finds',
  'Slow Horses of the Eastern Front',
  'A Very Polite Murder in the Cotswolds',
  'Rick and the Fourth Dimension',
  'Quiet on the Set',
  'Letters From a Distant Harbour',
  'Bad Sisters, Worse Brothers',
  'The Fall and Rise of Reginald Perrin Jr.',
  'Station Eleven Hundred',
  'Taskmaster: The Untitled Goose Special',
  'Heartstopper in Winter',
  'Sort Of',
  'Mythic Quest: Raven’s Banquet and Other Misadventures',
  'Reservation Dogs and the Missing Bike',
  'Hacks',
  'The Curious Case of the Vanishing Night Bus Driver',
  'Ghosts of Bellmore Manor',
  'Mr. Inbetween',
  'Normal People Doing Normal Things Very Slowly',
  'Somebody Somewhere Else',
  'Cobra Kai: The Neighbourhood Years',
  'The Responder',
  'What We Do in the Shadows of the Night Market',
  'Derry Girls Go West',
  'Wellington Paranormal',
  'Peep Show: Uncut',
  'Kaos',
  'Shrinking, Expanding and Everything In Between',
  'Poker Face at the Edge of the World',
  'Only Murders in the Building Across the Street',
  'Fleabag Revisited',
  'The Bastard Son & The Devil Himself',
  'Bodies',
  'Silo, Level Zero',
  'Pachinko',
  'Task',
  'Sweet Tooth: A Fable of the Last Forest',
  'Blue Eye Samurai',
  'Foundation and Earth',
  'Alice in Borderland: The Long Game',
  'The Afterparty',
  'Orphan Black: Echoes of Cosima',
  'Mom, Dad and the Other Dad',
  'Interview With the Vampire Lestat’s Cousin',
  'Beef',
  'Ripley',
] as const;

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type BulkKey = `bulk${'0' | '1' | '2' | '3' | '4'}${Digit}`;

const BULK_ART = [
  { backdrop: 'ds_dark_bd.jpg', poster: 'ds_dark_p.jpg' },
  { backdrop: 'ds_bridge_bd.jpg', poster: 'ds_slowhorses_p.jpg' },
  { backdrop: 'ds_andor_bd.jpg', poster: 'ds_12monkeys_p.jpg' },
  { backdrop: 'ds_edgerunners_bd.jpg', poster: 'ds_edgerunners_p.jpg' },
] as const;

const bulk = (index: number): ProfileShow => {
  const art = BULK_ART[index % BULK_ART.length] ?? BULK_ART[0];
  return show(
    991_001 + index,
    BULK_TITLES[index % BULK_TITLES.length] ?? `Show ${index}`,
    art,
    {
      episodes: 8 + (index % 7) * 4,
      genres: index % 2 ? ['Comedy', 'Drama'] : ['Crime', 'Mystery'],
      seasons: 1 + (index % 4),
    },
  );
};

const bulkEntries = Array.from(
  { length: BULK_TITLES.length },
  (_, index) => [`bulk${String(index).padStart(2, '0')}`, bulk(index)] as const,
);

/** `bulkKeys(5, 25)`: the keys `bulk05` to `bulk24` */
export const bulkKeys = (from: number, to: number): ReadonlyArray<BulkKey> =>
  Array.from(
    { length: to - from },
    (_, index) => `bulk${String(from + index).padStart(2, '0')}` as BulkKey,
  );

/**
 * The heavy profile's shows (`heavy.ts`): the long titles real libraries
 * have (documentary series with a subtitle), very long ones, one without a
 * space, Japanese, Korean and Arabic titles, so every text box on the
 * overview meets its worst case. Ids 992001 and up.
 */
const HEAVY_TITLES = [
  'Vatican Girl: The Disappearance of Emanuela Orlandi',
  'King of Collectibles: The Goldin Touch',
  'Hitler and the Nazis: Evil on Trial',
  'Fit for TV: The Reality of the Biggest Loser',
  'How to Sell Drugs Online (Fast)',
  'The Trials of Gabriel Fernandez',
  'Hulk Hogan: Real American',
  'How to Change Your Mind',
  'Unsolved Mysteries: The Complete Investigative Archive of Strange Disappearances',
  'Donaudampfschifffahrtsgesellschaftskapitänsmützenhersteller',
  '転生したらスライムだった件',
  '이상한 변호사 우영우',
  'مدرسة الروابي للبنات',
  'Dr. Seuss Baking Challenge: The Ultimate Whimsical Holiday Cookie Spectacular',
  'Tiger King: Murder, Mayhem and Madness',
  'Wild Wild Country',
  'Don’t F**k with Cats: Hunting an Internet Killer',
  'American Murder: The Family Next Door',
  'Bad Vegan: Fame. Fraud. Fugitives.',
  'The Tinder Swindler',
  'Formula 1: Drive to Survive',
  'Sunderland ’Til I Die',
  '進撃の巨人 The Final Season 完結編',
  'Ancient Apocalypse: The Americas',
  'Love on the Spectrum U.S.',
  'Wanda Sykes: I’m an Entertainer',
  'The Keepers',
  'Making a Murderer',
  'Our Planet II',
  'Inside Job',
  'Queer Eye',
  'Cheer',
  'Last Chance U: Basketball',
  'Worst Roommate Ever',
  'Squid Game: The Challenge',
  'Sintonia',
  'Elite: Short Stories',
  'Explained',
  'Abstract: The Art of Design',
  'Chef’s Table: Legends',
  'Street Food: Latin America',
  'The Last Dance',
  'Night on Earth',
  'Bridgerton',
] as const;

export type HeavyKey = `heavy${'0' | '1' | '2' | '3' | '4'}${Digit}`;

const HEAVY_ART = [
  { backdrop: 'ds_sopranos_bd.jpg', poster: 'ds_sopranos_p.jpg' },
  { backdrop: 'ds_breakingbad_bd.jpg', poster: 'ds_breakingbad_p.jpg' },
  { backdrop: 'ds_wire_bd.jpg', poster: 'ds_wire_p.jpg' },
  { backdrop: 'ds_bcs_bd.jpg', poster: 'ds_bcs_p.jpg' },
  { backdrop: 'ds_pluribus_bd.jpg', poster: 'ds_pluribus_p.jpg' },
  { backdrop: 'ds_strangerthings_bd.jpg', poster: 'ds_severance_p.jpg' },
] as const;

const heavy = (index: number): ProfileShow => {
  const art = HEAVY_ART[index % HEAVY_ART.length] ?? HEAVY_ART[0];
  return show(
    992_001 + index,
    HEAVY_TITLES[index % HEAVY_TITLES.length] ?? `Show ${index}`,
    art,
    {
      episodes: 10 + (index % 9) * 11,
      genres: index % 3 ? ['Documentary'] : ['Reality', 'Documentary'],
      runtime: 40 + (index % 5) * 7,
      seasons: 1 + (index % 6) * 2,
      status: index % 4 === 0 ? 'Ended' : 'Returning Series',
      type: index % 5 === 0 ? 'Miniseries' : 'Scripted',
    },
  );
};

/** `heavyKeys(0, 8)`: the keys `heavy00` to `heavy07` */
export const heavyKeys = (from: number, to: number): ReadonlyArray<HeavyKey> =>
  Array.from(
    { length: to - from },
    (_, index) => `heavy${String(from + index).padStart(2, '0')}` as HeavyKey,
  );

export const HEAVY_COUNT = HEAVY_TITLES.length;

export type ShowKey = keyof typeof SHOWS | BulkKey | HeavyKey;

const BULK = Object.fromEntries(bulkEntries) as Readonly<
  Record<BulkKey, ProfileShow>
>;

const HEAVY = Object.fromEntries(
  heavyKeys(0, HEAVY_TITLES.length).map(
    (key, index) => [key, heavy(index)] as const,
  ),
) as Readonly<Record<HeavyKey, ProfileShow>>;

/**
 * A shared show's own facts as the match carries them (`SharedShow`): the
 * first air year, the season count and the first genre's TMDB id
 */
export const sharedLine = (
  key: ShowKey,
): Readonly<{ genreId?: number; seasonCount: number; year: number }> => {
  const s = showOf(key);
  const [genre] = s.genres;
  const slug = genre
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const genreId = Number(
    slug ? landingFilter('genre', slug)?.with_genres : undefined,
  );
  return {
    ...(genreId ? { genreId } : {}),
    seasonCount: s.seasons,
    year: Number(s.firstAired.slice(0, 4)),
  };
};

export const showOf = (key: ShowKey): ProfileShow =>
  key in SHOWS
    ? SHOWS[key as keyof typeof SHOWS]
    : key.startsWith('heavy')
      ? HEAVY[key as HeavyKey]
      : BULK[key as BulkKey];

const ALL_SHOWS: ReadonlyArray<ProfileShow> = [
  ...Object.values(SHOWS),
  ...Object.values(BULK),
  ...Object.values(HEAVY),
];

export const showById = (id: number): ProfileShow | undefined =>
  ALL_SHOWS.find((candidate) => candidate.id === id);

/** A `ListItem` for a show */
export const listItem = (
  key: ShowKey,
  createdAt: number,
): Readonly<{
  createdAt: number;
  id: number;
  posterImage: string;
  posterPath: string;
  slug: string;
  status: string;
  title: string;
}> => {
  const s = showOf(key);
  return {
    createdAt,
    id: s.id,
    posterImage: s.poster,
    posterPath: s.poster ? `/${s.poster.split('/').pop()}` : '',
    slug: s.slug,
    status: s.status,
    title: s.title,
  };
};

export const identity = (key: ShowKey) => {
  const s = showOf(key);
  return {
    posterImage: s.poster,
    seriesId: s.id,
    slug: s.slug,
    title: s.title,
  } as const;
};
