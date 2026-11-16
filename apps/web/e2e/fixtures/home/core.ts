import type { Person, TvSeries } from '@tvseri.es/schemas';

import { series } from './base.ts';

/** A creator as TMDB's `created_by` lists them */
const person = (id: number, name: string): Person => ({
  character: '',
  id,
  image: '',
  job: '',
  name,
  numberOfEpisodes: 0,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
});

/**
 * What `/collection/trending` adds for the hook line's derived rule: the
 * creators, their best-known other show (none here) and the top three cast
 */
const withCredits = (
  show: TvSeries,
  credits: Readonly<{
    createdBy: ReadonlyArray<Person>;
    topCast: ReadonlyArray<string>;
  }>,
): TvSeries => ({
  ...show,
  createdBy: [...credits.createdBy],
  creatorOf: null,
  topCast: [...credits.topCast],
});

/** The spotlight's ten: trending this week, in rank order */
export const TRENDING: ReadonlyArray<TvSeries> = [
  series({
    backdrop: 'ds_pluribus_bd.jpg',
    color: '#212628',
    description:
      'The most miserable person on Earth must save the world from happiness.',
    genre: 'Sci-Fi & Fantasy',
    id: 225171,
    logo: 'ds_pluribus_logo.png',
    logoRatio: 2.5,
    poster: 'ds_pluribus_p.jpg',
    seasons: 1,
    tagline: 'Vince Gilligan’s first show since Better Call Saul',
    title: 'Pluribus',
    year: '2025',
  }),
  series({
    backdrop: 'st_bd_task.jpg',
    color: '#282616',
    description:
      'A task force investigates a string of violent home invasions.',
    genre: 'Crime',
    id: 250307,
    logo: 'st_logo_task.png',
    logoRatio: 4,
    poster: 'st_p_task.jpg',
    seasons: 1,
    tagline: 'Everyone in this town is hiding something.',
    title: 'Task',
    year: '2025',
  }),
  series({
    backdrop: 'st_bd_deptq.jpg',
    color: '#28210e',
    description:
      'A brilliant but troubled detective is put in charge of a new cold-case unit in the basement of Edinburgh’s police HQ. Together they reopen the files nobody wanted.',
    genre: 'Crime',
    id: 233660,
    logo: 'st_logo_deptq.png',
    poster: 'ds_deptq_p.jpg',
    seasons: 1,
    title: 'Dept. Q',
    year: '2025',
  }),
  series({
    backdrop: 'st_bd_pitt.jpg',
    color: '#252728',
    description:
      'Follow the staff of a Pittsburgh trauma centre through a single fifteen-hour shift, hour by painful hour, as the day unravels.',
    genre: 'Drama',
    id: 250307 + 1,
    logo: 'st_logo_pitt.png',
    poster: 'st_p_pitt.jpg',
    seasons: 2,
    title: 'The Pitt',
    year: '2025',
  }),
  // No tagline or overview: "With Tom Hardy, Helen Mirren and Pierce Brosnan"
  withCredits(
    series({
      backdrop: 'st_bd_mobland.jpg',
      color: '#1d2822',
      genre: 'Crime',
      id: 247718,
      logo: 'st_logo_mobland.png',
      poster: 'st_p_mobland.jpg',
      seasons: 1,
      title: 'MobLand',
      year: '2025',
    }),
    {
      createdBy: [person(1_000_001, 'Ronan Bennett')],
      topCast: ['Tom Hardy', 'Helen Mirren', 'Pierce Brosnan'],
    },
  ),
  // Creators who don't star: "Ended: 5 seasons, 42 episodes"
  withCredits(
    series({
      backdrop: 'ds_strangerthings_bd.jpg',
      color: '#280908',
      genre: 'Sci-Fi & Fantasy',
      id: 66732,
      numberOfEpisodes: 42,
      poster: 'er_stranger.jpg',
      seasons: 5,
      status: 'Ended',
      title: 'Stranger Things',
      year: '2016',
    }),
    {
      createdBy: [
        person(1_000_002, 'Matt Duffer'),
        person(1_000_003, 'Ross Duffer'),
      ],
      topCast: ['Winona Ryder', 'David Harbour', 'Millie Bobby Brown'],
    },
  ),
  // A creator in the cast: "From Bill Hader and Alec Berg"
  withCredits(
    series({
      backdrop: 'st_bd_barry.jpg',
      color: '#280103',
      genre: 'Comedy',
      id: 73107,
      logo: 'st_logo_barry.png',
      numberOfEpisodes: 32,
      poster: 'st_p_barry.jpg',
      seasons: 4,
      status: 'Ended',
      title: 'Barry',
      year: '2018',
    }),
    {
      createdBy: [
        person(1_000_004, 'Bill Hader'),
        person(1_000_005, 'Alec Berg'),
      ],
      topCast: ['Bill Hader', 'Stephen Root', 'Sarah Goldberg'],
    },
  ),
  series({
    backdrop: 'st_bd_blackmirror.jpg',
    color: '#132827',
    description:
      'Twisted tales run wild in this mind-bending anthology series.',
    genre: 'Sci-Fi & Fantasy',
    id: 42009,
    logo: 'st_logo_blackmirror.png',
    poster: 'st_p_blackmirror.jpg',
    seasons: 7,
    tagline: 'Every episode is a whole story.',
    title: 'Black Mirror',
    year: '2011',
  }),
  series({
    backdrop: 'st_bd_whitelotus.jpg',
    color: '#24281a',
    genre: 'Drama',
    id: 111803,
    logo: 'st_logo_whitelotus.png',
    nextEpisodeToAir: {
      airDate: '2026-11-17',
      episodeNumber: 1,
      seasonNumber: 4,
    },
    poster: 'st_p_whitelotus.jpg',
    seasons: 3,
    title: 'The White Lotus',
    year: '2021',
  }),
  series({
    backdrop: 'st_bd_dexres.jpg',
    color: '#0f2327',
    genre: 'Crime',
    id: 259909,
    logo: 'st_logo_dexres.png',
    poster: 'st_p_dexres.jpg',
    seasons: 2,
    title: 'Dexter: Resurrection',
    year: '2025',
  }),
];

/** "Top Picks for November" (most popular this month) */
export const TOP_PICKS: ReadonlyArray<TvSeries> = [
  series({
    genre: 'Drama',
    id: 95396,
    poster: 'ds_severance_p.jpg',
    seasons: 2,
    title: 'Severance',
    year: '2022',
  }),
  series({
    genre: 'Drama',
    id: 249042,
    poster: 'st_p_adolescence.jpg',
    seasons: 1,
    title: 'Adolescence',
    year: '2025',
  }),
  series({
    genre: 'Sci-Fi & Fantasy',
    id: 125988,
    poster: 'ds_silo_p.jpg',
    seasons: 2,
    title: 'Silo',
    year: '2023',
  }),
  series({
    genre: 'Drama',
    id: 245703,
    poster: 'st_p_paradise.jpg',
    seasons: 1,
    title: 'Paradise',
    year: '2025',
  }),
  series({
    genre: 'Crime',
    id: 194764,
    poster: 'ds_penguin_p.jpg',
    seasons: 1,
    title: 'The Penguin',
    year: '2024',
  }),
  series({
    genre: 'Action & Adventure',
    id: 202555,
    poster: 'st_p_daredevil.jpg',
    seasons: 2,
    title: 'Daredevil: Born Again',
    year: '2025',
  }),
  series({
    genre: 'Drama',
    id: 87917,
    poster: 'st_p_morningshow.jpg',
    seasons: 4,
    title: 'The Morning Show',
    year: '2019',
  }),
  series({
    genre: 'Crime',
    id: 113988,
    poster: 'ds_monster_p.jpg',
    seasons: 3,
    title: 'Monster',
    year: '2022',
  }),
  series({
    genre: 'Drama',
    id: 95480,
    poster: 'ds_slowhorses_p.jpg',
    seasons: 5,
    title: 'Slow Horses',
    year: '2022',
  }),
  series({
    genre: 'Reality',
    id: 136311,
    poster: 'st_p_traitors.jpg',
    seasons: 4,
    title: 'The Traitors',
    year: '2022',
  }),
  series({
    genre: 'Drama',
    id: 56570,
    poster: 'ds_outlander_p.jpg',
    seasons: 7,
    title: 'Outlander',
    year: '2014',
  }),
  series({
    genre: 'Sci-Fi & Fantasy',
    id: 84958,
    poster: 'ds_loki_p.jpg',
    seasons: 2,
    title: 'Loki',
    year: '2021',
  }),
];

/** "Pick one for me": the pool the deck fans out */
export const PICK_POOL: ReadonlyArray<TvSeries> = [
  series({
    genre: 'Comedy',
    id: 136311 + 7,
    nextEpisodeToAir: undefined,
    numberOfEpisodes: 34,
    poster: 'ds_shrinking_p.jpg',
    seasons: 3,
    title: 'Shrinking',
    year: '2023',
  }),
  series({
    genre: 'Comedy',
    id: 247767,
    numberOfEpisodes: 10,
    poster: 'st_p_studio.jpg',
    seasons: 1,
    title: 'The Studio',
    year: '2025',
  }),
  series({
    genre: 'Crime',
    id: 228744,
    numberOfEpisodes: 8,
    poster: 'ds_blackrabbit_p.jpg',
    seasons: 1,
    status: 'Ended',
    title: 'Black Rabbit',
    year: '2025',
  }),
  series({
    genre: 'Crime',
    id: 43982,
    numberOfEpisodes: 36,
    poster: 'ds_lineofduty_p.jpg',
    seasons: 6,
    status: 'Ended',
    title: 'Line of Duty',
    year: '2012',
  }),
  series({
    genre: 'Crime',
    id: 79744,
    numberOfEpisodes: 130,
    poster: 'ds_rookie_p.jpg',
    seasons: 7,
    title: 'The Rookie',
    year: '2018',
  }),
  series({
    genre: 'Crime',
    id: 80240,
    nextEpisodeToAir: {
      airDate: '2026-11-11',
      episodeNumber: 1,
      seasonNumber: 7,
    },
    numberOfEpisodes: 60,
    poster: 'st_p_mocro.jpg',
    seasons: 7,
    title: 'Mocro Maffia',
    year: '2018',
  }),
  series({
    genre: 'Comedy',
    id: 67070,
    numberOfEpisodes: 12,
    poster: 'ds_fleabag_p.jpg',
    seasons: 2,
    status: 'Ended',
    title: 'Fleabag',
    year: '2016',
  }),
];

/** "Hidden gems": high rating, few votes */
export const HIDDEN_GEMS: ReadonlyArray<TvSeries> = [
  series({ id: 241554, poster: 'ds_eric_p.jpg', title: 'Eric', year: '2024' }),
  series({ id: 81349, poster: 'ds_devs_p.jpg', title: 'Devs', year: '2020' }),
  series({
    id: 99966,
    poster: 'ds_badsisters_p.jpg',
    title: 'Bad Sisters',
    year: '2022',
  }),
  series({
    id: 64305,
    poster: 'ds_travelers_p.jpg',
    title: 'Travelers',
    year: '2016',
  }),
  series({
    id: 210016,
    poster: 'ds_athousandblows_p.jpg',
    title: 'A Thousand Blows',
    year: '2025',
  }),
  series({
    id: 87917 + 2,
    poster: 'ds_formankind_p.jpg',
    title: 'For All Mankind',
    year: '2019',
  }),
  series({
    id: 1416,
    poster: 'ds_lifeonmars_p.jpg',
    title: 'Life on Mars',
    year: '2006',
  }),
  series({
    id: 61859,
    poster: 'ds_nightmanager_p.jpg',
    title: 'The Night Manager',
    year: '2016',
  }),
  series({
    id: 65495,
    poster: 'ds_1122_p.jpg',
    title: '11.22.63',
    year: '2016',
  }),
  series({
    id: 61851,
    poster: 'ds_12monkeys_p.jpg',
    title: '12 Monkeys',
    year: '2015',
  }),
];
