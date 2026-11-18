import type { Premiere, Premieres, TvSeries } from '@tvseri.es/schemas';

import { FIXTURE_TODAY, series } from './base.ts';
import { PICK_POOL } from './core.ts';
import { ok, type StubRoute } from './routes.ts';

/**
 * The Premieres row (Wed 11 Nov) and the Countdown
 * (Sat 14 Nov), with the sample shows, images and services.
 */

const HBO_MAX = { id: 3186, logo: 'set_prov_hbomax.png', name: 'HBO Max' };
const IPLAYER = { id: 4, logo: 'st_prov_iplayer.png', name: 'BBC iPlayer' };
const NETFLIX = { id: 213, logo: 'st_prov_netflix.png', name: 'Netflix' };

const show = (
  id: number,
  title: string,
  name: string,
  year: string,
  network?: typeof NETFLIX,
): TvSeries =>
  series({
    backdrop: `st_bd_${name}.jpg`,
    genre: 'Drama',
    id,
    logo: `st_logo_${name}.png`,
    network,
    poster: `st_p_${name}.jpg`,
    title,
    year,
  });

const MOCRO = show(80240, 'Mocro Maffia', 'mocro', '2018');
const DEPT_Q = show(219109, 'Dept. Q', 'deptq', '2025', NETFLIX);
const WHITE_LOTUS = show(
  111803,
  'The White Lotus',
  'whitelotus',
  '2021',
  HBO_MAX,
);
const BARRY = show(73107, 'Barry', 'barry', '2018', HBO_MAX);
const CELEBRITY_TRAITORS = show(
  276880,
  'Celebrity Traitors',
  'celeb',
  '2025',
  IPLAYER,
);
const TRAITORS = show(135753, 'The Traitors', 'traitors', '2022', IPLAYER);
const TASK = show(245941, 'Task', 'task', '2025', HBO_MAX);
const PITT = show(250307, 'The Pitt', 'pitt', '2025', HBO_MAX);

const premiere = (
  series: TvSeries,
  date: string,
  daysAway: number,
  fields: Partial<Premiere>,
): Premiere => ({
  date,
  daysAway,
  isBig: false,
  kind: 'season-premiere',
  release: 'weekly',
  seasonNumber: 1,
  series,
  ...fields,
});

/** The three big ones, counted from Wed 11 (the row's day) */
const BIG_FROM_WED: ReadonlyArray<Premiere> = [
  premiere(WHITE_LOTUS, '2026-11-17', 6, { isBig: true, seasonNumber: 4 }),
  premiere(BARRY, '2026-11-19', 8, {
    isBig: true,
    kind: 'special',
    release: null,
    seasonNumber: 6,
  }),
  premiere(TRAITORS, '2026-12-02', 21, { isBig: true, seasonNumber: 5 }),
];

/** `GET /premieres` on Wed 11 Nov: the row's tickets, in date order */
export const PREMIERES: Premieres = {
  countdown: { isDue: false, items: BIG_FROM_WED },
  date: FIXTURE_TODAY,
  items: [
    premiere(MOCRO, '2026-11-11', 0, {
      release: 'full-season',
      seasonNumber: 7,
    }),
    premiere(DEPT_Q, '2026-11-12', 1, {
      release: 'full-season',
      seasonNumber: 2,
    }),
    BIG_FROM_WED[0]!,
    BIG_FROM_WED[1]!,
    premiere(CELEBRITY_TRAITORS, '2026-11-21', 10, {
      kind: 'season-finale',
      release: null,
      seasonNumber: 2,
    }),
    BIG_FROM_WED[2]!,
    premiere(TASK, '2026-12-15', 34, { seasonNumber: 2 }),
    premiere(PITT, '2027-01-08', 58, { seasonNumber: 3 }),
  ],
};

/**
 * The Countdown as Sat 14 draws it: in 3, 5 and 18 days. Barry without its
 * logo (the written title stands in) and the third with a long title, so
 * the pills truncate on a phone.
 */
const COUNTDOWN_EDGES: Readonly<Record<string, Partial<TvSeries>>> = {
  Barry: { titleTreatmentImage: undefined },
  'The Traitors': { title: 'The Traitors: The Celebrity Edition Returns' },
};

/**
 * The Countdown's shows carry their backdrop's colour (the API's detection
 * on the sample images; `GET /premieres` sends none)
 */
const COUNTDOWN_COLORS: Readonly<Record<string, string>> = {
  Barry: '#080808',
  'The Traitors': '#080808',
  'The White Lotus': '#080808',
};

export const COUNTDOWN_PREMIERES: ReadonlyArray<Premiere> = BIG_FROM_WED.map(
  (item) => ({
    ...item,
    daysAway: item.daysAway - 3,
    series: {
      ...item.series,
      backdropColor: COUNTDOWN_COLORS[item.series.title] ?? '#000000',
      ...COUNTDOWN_EDGES[item.series.title],
    },
  }),
);

/**
 * The deck, with its lines written out: the pick
 * pool plus the fields `pickWhy` reads. The Studio's first air date sits
 * inside the last twelve months so it reads "New this year".
 */
const DECK_FIELDS: Readonly<Record<string, Partial<TvSeries>>> = {
  Fleabag: { voteAverage: 8.6 },
  'Line of Duty': { voteAverage: 8.2 },
  Shrinking: {
    lastEpisodeToAir: {
      airDate: '2026-04-08',
      description: '',
      episodeNumber: 11,
      hasAired: true,
      id: 3011,
      runtime: 30,
      seasonNumber: 3,
      stillImage: '',
      stillPath: '',
      title: '',
    },
  },
  'The Studio': { firstAirDate: '2025-11-26' },
};

export const PICK_DECK: ReadonlyArray<TvSeries> = PICK_POOL.map((item) => ({
  ...item,
  ...DECK_FIELDS[item.title],
}));

export const PREMIERES_ROUTES: Readonly<Record<string, StubRoute>> = {
  '/premieres': () => ok(PREMIERES),
};
