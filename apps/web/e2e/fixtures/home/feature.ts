import type {
  BingeShow,
  DidYouKnowFact,
  Episode,
  Feature,
  TvSeries,
} from '@tvseri.es/schemas';

import { featureKindOfDay } from '../../../../../packages/utils/src/rotation.ts';
import { BOARD_TODAY, img, series } from './base.ts';
import { LONG_TITLES_FROM, withLongTitles } from './longTitles.ts';
import { COUNTDOWN_PREMIERES } from './premieres.ts';
import { notFound, ok, type StubRoute } from './routes.ts';

/**
 * The feature of the day as HMFinal draws it, one per kind (Mon 9 = binge,
 * Tue 10 = stills, Wed 11 = archive, Sat 14 = countdown; Did you know is on
 * no demo day: its four facts are the board's `e2-dk` markup).
 */

const lastEpisode = (runtime: number) => ({ runtime }) as Episode;

const bingeShow = (
  input: Readonly<{
    id: number;
    poster: string;
    runtime: number;
    seasons: ReadonlyArray<number>;
    title: string;
    year: string;
  }>,
): BingeShow => {
  const numberOfEpisodes = input.seasons.reduce((sum, n) => sum + n, 0);
  return {
    episodeRuntime: input.runtime,
    numberOfEpisodes,
    seasons: input.seasons,
    series: series({
      id: input.id,
      numberOfEpisodes,
      poster: input.poster,
      seasons: input.seasons.length,
      title: input.title,
      year: input.year,
    }),
    totalMinutes: numberOfEpisodes * input.runtime,
  };
};

/** The board's BPOOL and BSEAS */
const BINGE_SHOWS: ReadonlyArray<BingeShow> = [
  bingeShow({
    id: 70523,
    poster: 'ds_dark_p.jpg',
    runtime: 52,
    seasons: [10, 8, 8],
    title: 'Dark',
    year: '2017',
  }),
  bingeShow({
    id: 1438,
    poster: 'ds_wire_p.jpg',
    runtime: 58,
    seasons: [13, 12, 12, 13, 10],
    title: 'The Wire',
    year: '2002',
  }),
  bingeShow({
    id: 60574,
    poster: 'ds_peaky_p.jpg',
    runtime: 58,
    seasons: [6, 6, 6, 6, 6, 6],
    title: 'Peaky Blinders',
    year: '2013',
  }),
  bingeShow({
    id: 67070,
    poster: 'ds_fleabag_p.jpg',
    runtime: 27,
    seasons: [6, 6],
    title: 'Fleabag',
    year: '2016',
  }),
];

const DARK = BINGE_SHOWS[0] as BingeShow;

const BINGE_FEATURE: Feature = {
  episodeRuntime: DARK.episodeRuntime,
  kind: 'binge',
  numberOfEpisodes: DARK.numberOfEpisodes,
  series: DARK.series,
  shows: BINGE_SHOWS,
  totalMinutes: DARK.totalMinutes,
};

const STILL_TITLES = ['Beef', 'Pasta', 'Sundae', 'Honeydew', 'Pop', 'Fishes'];

const STILLS_FEATURE: Feature = {
  kind: 'stills',
  season: {
    airDate: '2023-06-22',
    numberOfEpisodes: 10,
    posterImage: img('st_p_bear.jpg'),
    seasonNumber: 2,
  },
  series: series({
    backdrop: 'ep_bear_bd.jpg',
    genre: 'Comedy',
    id: 136315,
    logo: 'ep_bear_logo.png',
    poster: 'st_p_bear.jpg',
    seasons: 4,
    title: 'The Bear',
    year: '2022',
  }),
  stills: STILL_TITLES.map((title, index) => ({
    episodeNumber: index + 1,
    image: img(`ep_s2e${index + 1}.jpg`),
    title,
  })),
};

/**
 * The block's other shape: twelve stills, the most the API sends (the
 * board's "shape test", HMStillsVariants A: the season's ten, then the
 * first two again), on the long-title days with their long titles
 */
const STILLS_TWELVE: Feature = {
  ...STILLS_FEATURE,
  stills: Array.from({ length: 12 }, (_, index) => ({
    episodeNumber: index + 1,
    image: img(`ep_s2e${(index % 7) + 1}.jpg`),
    title: STILL_TITLES[index % STILL_TITLES.length] ?? '',
  })),
};

const ARCHIVE_FEATURE: Feature = {
  allTime: { oldest: true, rank: 5, top: 5 },
  kind: 'archive',
  rank: 1,
  series: series({
    backdrop: 'ds_wire_bd.jpg',
    genre: 'Crime',
    id: 1438,
    poster: 'ds_wire_p.jpg',
    seasons: 5,
    status: 'Ended',
    tagline: 'Five seasons, one city, every institution in it.',
    title: 'The Wire',
    year: '2002',
  }),
  yearsOld: 24,
};

const fact = (
  type: DidYouKnowFact['type'],
  value: number,
  show: TvSeries,
): DidYouKnowFact => ({ series: show, type, value });

/** Each show's `backdropColor`: the API's detection on the board image */
const DID_YOU_KNOW_FEATURE: Feature = {
  facts: [
    fact('hours', 48, {
      ...series({
        backdrop: 'ds_breakingbad_bd.jpg',
        color: '#2a4949',
        genre: 'Crime',
        id: 1396,
        numberOfEpisodes: 62,
        seasons: 5,
        status: 'Ended',
        title: 'Breaking Bad',
        year: '2008',
      }),
      lastEpisodeToAir: lastEpisode(47),
    }),
    fact(
      'episodes',
      63,
      series({
        backdrop: 'ds_bcs_bd.jpg',
        color: '#282828',
        genre: 'Crime',
        id: 60059,
        numberOfEpisodes: 63,
        seasons: 6,
        status: 'Ended',
        title: 'Better Call Saul',
        year: '2015',
      }),
    ),
    fact('years', 8, {
      ...series({
        backdrop: 'ds_sopranos_bd.jpg',
        color: '#080808',
        genre: 'Crime',
        id: 1398,
        numberOfEpisodes: 86,
        seasons: 6,
        status: 'Ended',
        title: 'The Sopranos',
        year: '1999',
      }),
      firstAirDate: '1999-01-10',
      lastAirDate: '2007-06-10',
    }),
    fact(
      'episodes',
      201,
      series({
        backdrop: 'ds_office_bd.jpg',
        color: '#080808',
        genre: 'Comedy',
        id: 2316,
        numberOfEpisodes: 201,
        seasons: 9,
        status: 'Ended',
        title: 'The Office',
        year: '2005',
      }),
    ),
  ],
  kind: 'did-you-know',
};

const COUNTDOWN_FEATURE: Feature = {
  kind: 'countdown',
  premieres: COUNTDOWN_PREMIERES,
};

/** Every kind, by the name the stub state uses (`state.feature`) */
export const FEATURES: Readonly<Record<string, Feature>> = {
  archive: ARCHIVE_FEATURE,
  binge: BINGE_FEATURE,
  countdown: COUNTDOWN_FEATURE,
  'did-you-know': DID_YOU_KNOW_FEATURE,
  stills: STILLS_FEATURE,
};

/**
 * Days the Countdown takes the feature slot (the API's rule, a big premiere
 * 3 days away or less), for `/dev/home?day=` and home-overflow: Thu 31
 * Dec with the boards' titles, Sat 9 Jan 2027 with the long ones
 */
const COUNTDOWN_DAYS: ReadonlySet<string> = new Set([
  '2026-12-31',
  '2027-01-09',
]);

/** The Countdown's premieres as seen from `day`: the same days away */
const countdownFrom = (day: string): Feature => ({
  kind: 'countdown',
  premieres: COUNTDOWN_PREMIERES.map((premiere) => ({
    ...premiere,
    date: new Date(Date.parse(`${day}T00:00:00Z`) + premiere.daysAway * 864e5)
      .toISOString()
      .slice(0, 10),
  })),
});

/** Stub routes for the home page's feature fixtures */
export const FEATURE_ROUTES: Readonly<Record<string, StubRoute>> = {
  '/home/feature': (url, state) => {
    const date = url.searchParams.get('date') ?? '';
    // `kind`: a day outside the API's window asks for the kind it plans
    const kind =
      state.feature ??
      (COUNTDOWN_DAYS.has(date) ? 'countdown' : undefined) ??
      url.searchParams.get('kind') ??
      featureKindOfDay(date);
    const long = date >= LONG_TITLES_FROM || state.longTitles;
    const board =
      kind === 'countdown' && COUNTDOWN_DAYS.has(date)
        ? countdownFrom(date)
        : kind === 'stills' && long
          ? STILLS_TWELVE
          : FEATURES[kind];
    const feature = board && long ? withLongTitles(board) : board;
    return feature ? ok({ date: BOARD_TODAY, feature }) : notFound();
  },
};
