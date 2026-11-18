import { type ProfileShow, show } from './shows.ts';

/**
 * The heavy profile's Library: 320 invented shows (ids 993001 and up) whose
 * titles meet every rule of the Library's A–Z: leading "The"/"A"/"An", accents,
 * titles that start with digits, Japanese, Korean and Arabic titles (the rail's
 * `#`), titles past 80 characters, and every letter of the rail. Deterministic:
 * a seeded generator, no `Math.random`.
 */

/** mulberry32: a small seeded generator, so every run builds the same data */
export const seeded = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const SPECIAL_TITLES = [
  'The Bear Necessities of Running a Very Small Restaurant in a Very Big City at Night',
  'A Man on the Inside',
  'An Idiot Abroad',
  'The',
  'Élite',
  'Señorita 89',
  'Ōoku: The Inner Chambers',
  'Ça Va Aller',
  '11.22.63',
  '12 Monkeys',
  '1883',
  '30 Coins',
  '2 Broke Girls',
  '進撃の巨人',
  'ブルーロック',
  '오징어 게임',
  '이상한 변호사 우영우',
  'المنصة',
  'جن',
  'The Extraordinarily Long Winter of the Lighthouse Keepers of the Northern Isles, Part Two',
  'Quiz',
  'Xenia',
  'Yellowjackets of the Valley',
  'Zoë and the Midnight Choir',
  'Unbelievable',
  'Kin',
  'Ozark Nights',
  'Inside No. 9 and a Half',
  'Jamestown',
  'Vigil',
] as const;

const ADJECTIVES = [
  'Amber',
  'Broken',
  'Crimson',
  'Distant',
  'Electric',
  'Fading',
  'Golden',
  'Hollow',
  'Iron',
  'Jade',
  'Kindred',
  'Lonely',
  'Midnight',
  'Northern',
  'Open',
  'Painted',
  'Quiet',
  'Restless',
  'Silver',
  'Tidal',
  'Unquiet',
  'Velvet',
  'Winter',
  'Xeric',
  'Yellow',
  'Zero',
] as const;

const NOUNS = [
  'Harbour',
  'Kingdom',
  'Line',
  'Signal',
  'Valley',
  'House',
  'Road',
  'Coast',
  'Circle',
  'Archive',
  'Season',
  'Tide',
] as const;

const ART = [
  { backdrop: 'ds_dark_bd.jpg', poster: 'ds_dark_p.jpg' },
  { backdrop: 'ds_bridge_bd.jpg', poster: 'ds_slowhorses_p.jpg' },
  { backdrop: 'ds_andor_bd.jpg', poster: 'ds_12monkeys_p.jpg' },
  { backdrop: 'ds_edgerunners_bd.jpg', poster: 'ds_edgerunners_p.jpg' },
  { backdrop: 'ds_sopranos_bd.jpg', poster: 'ds_sopranos_p.jpg' },
  { backdrop: 'ds_breakingbad_bd.jpg', poster: 'ds_breakingbad_p.jpg' },
  { backdrop: 'ds_wire_bd.jpg', poster: 'ds_wire_p.jpg' },
  { backdrop: 'ds_bcs_bd.jpg', poster: 'ds_bcs_p.jpg' },
] as const;

/** How many shows the heavy Library has */
export const PG_SHOW_COUNT = 320;

const titles = (): string[] => {
  const random = seeded(320);
  const generated = ADJECTIVES.flatMap((adjective, a) =>
    NOUNS.map((noun, n) =>
      (a + n) % 3 === 0 ? `The ${adjective} ${noun}` : `${adjective} ${noun}`,
    ),
  );
  // a stable shuffle, so the lists mix letters
  for (let index = generated.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [generated[index], generated[other]] = [
      generated[other] as string,
      generated[index] as string,
    ];
  }
  return [...SPECIAL_TITLES, ...generated].slice(0, PG_SHOW_COUNT);
};

const STATUSES: ReadonlyArray<ProfileShow['status']> = [
  'Ended',
  'Returning Series',
  'Ended',
  'Canceled',
];

const build = (): ReadonlyArray<ProfileShow> =>
  titles().map((title, index) =>
    show(993_001 + index, title, ART[index % ART.length] ?? ART[0], {
      episodes: (1 + (index % 6)) * (8 + (index % 5)),
      firstAired: `${2008 + (index % 18)}-0${1 + (index % 9)}-15`,
      genres: index % 2 ? ['Drama'] : ['Crime', 'Mystery'],
      runtime: 25 + (index % 8) * 5,
      seasons: 1 + (index % 6),
      status: STATUSES[index % STATUSES.length] ?? 'Ended',
      type: index % 7 === 0 ? 'Miniseries' : 'Scripted',
    }),
  );

let cache: ReadonlyArray<ProfileShow> | null = null;

/** The 320 shows, in id order */
export const pgShows = (): ReadonlyArray<ProfileShow> => {
  cache ??= build();
  return cache;
};

export const pgShowById = (id: number): ProfileShow | undefined =>
  id >= 993_001 && id < 993_001 + PG_SHOW_COUNT
    ? pgShows()[id - 993_001]
    : undefined;
