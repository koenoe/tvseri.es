import type {
  BecauseYouWatched,
  ConnectedPath,
  ConnectedPerson,
  Toy,
  TvSeries,
  VersusSide,
  WhatsOnChannel,
  WherePlace,
} from '@tvseri.es/schemas';

import { toyKindOfDay } from '../../../../../packages/utils/src/rotation.ts';
import { showById } from '../../stub-api/fixtures/user-profile/shows.ts';
import { FIXTURE_TODAY, img, series, slugify } from './base.ts';
import { TOP_PICKS, TRENDING } from './core.ts';
import { LONG_TITLES_FROM, withLongTitles } from './longTitles.ts';
import { notFound, ok, type StubRoute } from './routes.ts';

/**
 * The toy of the day: What's on (Mon 9), Where are they
 * set? (Tue 10), Connected by (Wed 11), Versus (Thu 12, Sun 15) and, signed
 * in, If you liked The Bear (Tue 10). The sample shows, copy and images.
 */

const channel = (
  network: WhatsOnChannel['network'],
  show: Parameters<typeof series>[0],
): WhatsOnChannel => ({ network, series: series(show) });

/** The six channels and what's on them */
const WHATS_ON: Toy = {
  channels: [
    channel(
      {
        id: 213,
        logo: img('st_prov_netflix.png'),
        logoKind: 'icon',
        name: 'Netflix',
        wordmark: img('st_wm_netflix.png'),
      },
      {
        backdrop: 'st_bd_blackmirror.jpg',
        genre: 'Sci-Fi & Fantasy',
        id: 42009,
        logo: 'st_logo_blackmirror.png',
        seasons: 7,
        title: 'Black Mirror',
        year: '2011',
      },
    ),
    channel(
      {
        id: 3186,
        logo: img('set_prov_hbomax.png'),
        logoKind: 'icon',
        name: 'HBO Max',
        wordmark: img('st_wm_hbomax.png'),
      },
      {
        backdrop: 'st_bd_pitt.jpg',
        genre: 'Drama',
        id: 250307,
        logo: 'st_logo_pitt.png',
        seasons: 2,
        title: 'The Pitt',
        year: '2025',
      },
    ),
    channel(
      {
        id: 2552,
        logo: img('ds_appletv_net.png'),
        logoKind: 'wordmark',
        name: 'Apple TV',
        wordmark: img('ds_appletv_net.png'),
      },
      {
        backdrop: 'ds_pluribus_bd.jpg',
        genre: 'Sci-Fi & Fantasy',
        id: 225171,
        logo: 'ds_pluribus_logo.png',
        seasons: 1,
        title: 'Pluribus',
        year: '2025',
      },
    ),
    channel(
      {
        id: 4330,
        logo: img('st_prov_paramount.png'),
        logoKind: 'icon',
        name: 'Paramount+',
        wordmark: '',
      },
      {
        backdrop: 'st_bd_mobland.jpg',
        genre: 'Crime',
        id: 247718,
        logo: 'st_logo_mobland.png',
        seasons: 1,
        title: 'MobLand',
        year: '2025',
      },
    ),
    channel(
      {
        id: 1024,
        logo: img('st_prov_prime.png'),
        logoKind: 'icon',
        name: 'Prime Video',
        wordmark: img('st_wm_prime.png'),
      },
      {
        backdrop: 'ds_boys_bd.jpg',
        genre: 'Sci-Fi & Fantasy',
        id: 76479,
        seasons: 5,
        title: 'The Boys',
        year: '2019',
      },
    ),
    channel(
      {
        id: 453,
        logo: img('ep_logo_hulu.png'),
        logoKind: 'wordmark',
        name: 'Hulu',
        wordmark: img('ep_logo_hulu.png'),
      },
      {
        backdrop: 'ep_bear_bd.jpg',
        genre: 'Comedy',
        id: 136315,
        logo: 'ep_bear_logo.png',
        seasons: 4,
        title: 'The Bear',
        year: '2022',
      },
    ),
  ],
  kind: 'whats-on',
};

const place = (
  input: Omit<WherePlace, 'others' | 'series'> &
    Readonly<{
      others?: ReadonlyArray<Parameters<typeof series>[0]>;
      show: Parameters<typeof series>[0];
    }>,
): WherePlace => ({
  lat: input.lat,
  lng: input.lng,
  name: input.name,
  others: (input.others ?? []).map(series),
  series: series(input.show),
  slug: input.slug,
});

/** Five places, Baltimore first (Tue 10) */
const WHERE_SET: Toy = {
  featured: 'baltimore',
  kind: 'where-set',
  places: [
    place({
      lat: 39.2904,
      lng: -76.6122,
      name: 'Baltimore',
      // sample art stands in for these two (fixture only)
      others: [
        {
          backdrop: 'ds_bridge_bd.jpg',
          genre: 'Crime',
          id: 4464,
          seasons: 7,
          title: 'Homicide: Life on the Street',
          year: '1993',
        },
        {
          backdrop: 'ds_mare_bd.jpg',
          genre: 'Crime',
          id: 125949,
          seasons: 1,
          title: 'We Own This City',
          year: '2022',
        },
      ],
      show: {
        backdrop: 'ds_wire_bd.jpg',
        genre: 'Crime',
        id: 1438,
        seasons: 5,
        title: 'The Wire',
        year: '2002',
      },
      slug: 'baltimore',
    }),
    place({
      lat: 35.0844,
      lng: -106.6504,
      name: 'Albuquerque',
      others: [
        {
          backdrop: 'ds_bcs_bd.jpg',
          genre: 'Crime',
          id: 60059,
          seasons: 6,
          title: 'Better Call Saul',
          year: '2015',
        },
      ],
      // a logo for one of the places; the others are drawn as text
      show: {
        backdrop: 'ds_breakingbad_bd.jpg',
        genre: 'Crime',
        id: 1396,
        logo: 'pp_logo_bb.png',
        seasons: 5,
        title: 'Breaking Bad',
        year: '2008',
      },
      slug: 'albuquerque',
    }),
    place({
      lat: 6.2476,
      lng: -75.5658,
      name: 'Medellín',
      show: {
        backdrop: 'ds_narcos_bd.jpg',
        genre: 'Crime',
        id: 63351,
        seasons: 3,
        title: 'Narcos',
        year: '2015',
      },
      slug: 'medellin',
    }),
    place({
      lat: 40.4168,
      lng: -3.7038,
      name: 'Madrid',
      show: {
        backdrop: 'ds_moneyheist_bd.jpg',
        genre: 'Crime',
        id: 71446,
        seasons: 5,
        title: 'Money Heist',
        year: '2017',
      },
      slug: 'madrid',
    }),
    place({
      lat: 51.3945,
      lng: 30.0996,
      name: 'Pripyat',
      show: {
        backdrop: 'ds_chernobyl_bd.jpg',
        genre: 'Drama',
        id: 87108,
        seasons: 1,
        title: 'Chernobyl',
        year: '2019',
      },
      slug: 'pripyat',
    }),
  ],
};

const MALCOLM = series({
  id: 2004,
  poster: 'pp_p_malcolm.jpg',
  title: 'Malcolm in the Middle',
  year: '2000',
});
const BREAKING_BAD = series({
  id: 1396,
  poster: 'pp_p_bb.jpg',
  title: 'Breaking Bad',
  year: '2008',
});
const BETTER_CALL_SAUL = series({
  id: 60059,
  poster: 'pp_p_bcs.jpg',
  title: 'Better Call Saul',
  year: '2015',
});

const person = (
  id: number,
  name: string,
  image: string,
  characters: ReadonlyArray<string>,
): ConnectedPerson => ({
  characters,
  id,
  image: img(image),
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
});

const CRANSTON = person(17419, 'Bryan Cranston', 'pp_profile.jpg', [
  'Hal',
  'Walter White',
]);

/** A two-step path: start, the person into Breaking Bad, then `second` into `end` */
const pathVia = (
  start: TvSeries,
  first: ConnectedPerson,
  second: ConnectedPerson,
  end: TvSeries,
): ConnectedPath => ({
  nodes: [
    { series: start, type: 'show' },
    { person: first, type: 'person' },
    { series: BREAKING_BAD, type: 'show' },
    { person: second, type: 'person' },
    { series: end, type: 'show' },
  ],
  steps: 2,
});

/**
 * Malcolm to Better Call Saul through Breaking Bad, then two
 * more paths from Malcolm through Breaking Bad to other shows
 */
const PATHS: ReadonlyArray<ConnectedPath> = [
  pathVia(
    MALCOLM,
    CRANSTON,
    person(59410, 'Bob Odenkirk', 'pp_c_odenkirk.jpg', [
      'Saul Goodman',
      'Saul Goodman',
    ]),
    BETTER_CALL_SAUL,
  ),
  pathVia(
    MALCOLM,
    CRANSTON,
    person(4808, 'Giancarlo Esposito', 'pq_c_esposito.jpg', [
      'Gus Fring',
      'Moff Gideon',
    ]),
    series({
      id: 82856,
      poster: 'pp_p_mandalorian.jpg',
      title: 'The Mandalorian',
      year: '2019',
    }),
  ),
  pathVia(
    MALCOLM,
    CRANSTON,
    person(84497, 'Aaron Paul', 'pp_c_paul.jpg', [
      'Jesse Pinkman',
      'Caleb Nichols',
    ]),
    series({
      id: 63247,
      poster: 'pp_p_westworld.jpg',
      title: 'Westworld',
      year: '2016',
    }),
  ),
];

const CONNECTED_BY: Toy = { kind: 'connected-by', paths: PATHS };

const side = (
  id: number,
  title: string,
  poster: string,
  facts: Readonly<{
    episodes: number;
    seasons: number;
    voteAverage: number;
    years: string;
  }>,
): VersusSide => ({
  ...facts,
  id,
  posterImage: img(poster),
  slug: slugify(title),
  title,
});

/**
 * Versus: Dark and Devs first, then five
 * more pairs. Severance is in the member's library (`nina`, watched), so
 * signed in as her that pair is left out; `e2e/home-versus.spec.ts` answers
 * the viewer's library with The Bear in progress for the same check.
 * Severance and Silo have the same number of seasons (no winner on that row).
 */
const VERSUS: Toy = {
  kind: 'versus',
  pairs: [
    {
      left: side(70523, 'Dark', 'ds_dark_p.jpg', {
        episodes: 26,
        seasons: 3,
        voteAverage: 8.4,
        years: '2017–2020',
      }),
      right: side(81349, 'Devs', 'ds_devs_p.jpg', {
        episodes: 8,
        seasons: 1,
        voteAverage: 7.6,
        years: '2020',
      }),
    },
    {
      left: side(136315, 'The Bear', 'st_p_bear.jpg', {
        episodes: 38,
        seasons: 4,
        voteAverage: 8.1,
        years: '2022–',
      }),
      right: side(136311, 'Shrinking', 'ds_shrinking_p.jpg', {
        episodes: 22,
        seasons: 2,
        voteAverage: 8.1,
        years: '2023–',
      }),
    },
    {
      left: side(95396, 'Severance', 'ds_severance_p.jpg', {
        episodes: 19,
        seasons: 2,
        voteAverage: 8.4,
        years: '2022–',
      }),
      right: side(125988, 'Silo', 'ds_silo_p.jpg', {
        episodes: 20,
        seasons: 2,
        voteAverage: 8.1,
        years: '2023–',
      }),
    },
    {
      left: side(95480, 'Slow Horses', 'ds_slowhorses_p.jpg', {
        episodes: 30,
        seasons: 5,
        voteAverage: 8.1,
        years: '2022–',
      }),
      right: side(61859, 'The Night Manager', 'ds_nightmanager_p.jpg', {
        episodes: 12,
        seasons: 2,
        voteAverage: 7.7,
        years: '2016–',
      }),
    },
    {
      left: side(43982, 'Line of Duty', 'ds_lineofduty_p.jpg', {
        episodes: 36,
        seasons: 6,
        voteAverage: 8.3,
        years: '2012–2021',
      }),
      right: side(1871, 'Life on Mars', 'ds_lifeonmars_p.jpg', {
        episodes: 16,
        seasons: 2,
        voteAverage: 8.0,
        years: '2006–2007',
      }),
    },
    {
      left: side(61851, '12 Monkeys', 'ds_12monkeys_p.jpg', {
        episodes: 47,
        seasons: 4,
        voteAverage: 7.7,
        years: '2015–2018',
      }),
      right: side(68716, 'Travelers', 'ds_travelers_p.jpg', {
        episodes: 34,
        seasons: 3,
        voteAverage: 7.6,
        years: '2016–2018',
      }),
    },
  ],
};

/** Every toy by kind, for `POST /__stub/state { toy }` */
export const TOYS: Readonly<Record<string, Toy>> = {
  'connected-by': CONNECTED_BY,
  versus: VERSUS,
  'whats-on': WHATS_ON,
  'where-set': WHERE_SET,
};

/** Signed in, Tue 10: If you liked The Bear */
export const IF_YOU_LIKED: BecauseYouWatched = {
  items: [
    {
      reason: { kind: 'network', label: 'HBO' },
      series: series({
        genre: 'Drama',
        id: 76331,
        poster: 'ep_rec_succession.jpg',
        title: 'Succession',
        year: '2018',
      }),
    },
    {
      reason: { kind: 'keyword', label: 'family business' },
      series: series({
        genre: 'Drama',
        id: 1274,
        poster: 'ep_rec_sixfeet.jpg',
        title: 'Six Feet Under',
        year: '2001',
      }),
    },
    {
      reason: { kind: 'recommendation', label: '' },
      series: series({
        genre: 'Comedy',
        id: 34307,
        poster: 'ep_rec_shameless.jpg',
        title: 'Shameless',
        year: '2011',
      }),
    },
    {
      reason: { kind: 'keyword', label: 'grief' },
      series: series({
        genre: 'Comedy',
        id: 79525,
        poster: 'ep_rec_afterlife.jpg',
        title: 'After Life',
        year: '2019',
      }),
    },
  ],
  source: {
    from: 'watched',
    id: 136315,
    series: series({
      genre: 'Comedy',
      id: 136315,
      poster: 'st_p_bear.jpg',
      seasons: 4,
      title: 'The Bear',
      year: '2022',
    }),
    title: 'The Bear',
  },
};

const byTitle = (
  list: ReadonlyArray<TvSeries>,
  title: string,
): TvSeries | undefined => list.find((show) => show.title === title);

/** A show of the profile rig (the signed-in viewers' libraries) as a series */
const profileSeries = (id: number): TvSeries | undefined => {
  const show = showById(id);
  return show
    ? {
        ...series({ id, title: show.title, year: show.firstAired.slice(0, 4) }),
        posterImage: show.poster,
      }
    : undefined;
};

/** MobLand: in alex's lists (the profile rig), so alex never gets its path */
const MOBLAND_ID = 990010;

/**
 * `GET /home/connected?from=`: paths from any show the fixtures know (Home's
 * and the profile rig's, where the signed-in viewers' libraries
 * live), through Breaking Bad, to Dept. Q, MobLand, Succession, Black
 * Mirror, Six Feet Under and Shameless (never the start itself)
 */
function pathsFrom(start: TvSeries): ReadonlyArray<ConnectedPath> {
  const liked = IF_YOU_LIKED.items.map((item) => item.series);
  const ends = [
    byTitle(TRENDING, 'Dept. Q'),
    profileSeries(MOBLAND_ID),
    liked[0],
    byTitle(TRENDING, 'Black Mirror'),
    liked[1],
    liked[2],
  ].filter(
    (show): show is TvSeries => show !== undefined && show.id !== start.id,
  );
  const first = person(17419, 'Bryan Cranston', 'pp_profile.jpg', [
    'Himself',
    'Walter White',
  ]);
  return ends.map((end, index) =>
    pathVia(
      start,
      first,
      person(90000 + index, `Actor ${index + 1}`, 'pq_c_esposito.jpg', [
        `Role ${index + 1}`,
        `Part in ${end.title}`,
      ]),
      end,
    ),
  );
}

const CONNECTED_STARTS: ReadonlyArray<TvSeries> = [
  MALCOLM,
  ...TOP_PICKS,
  ...TRENDING,
];

const connectedStart = (id: number) =>
  CONNECTED_STARTS.find((show) => show.id === id) ?? profileSeries(id);

/** Stub routes for the home page's toy of the day */
export const TOY_ROUTES: Readonly<Record<string, StubRoute>> = {
  '/home/connected': (url) => {
    const from = Number(url.searchParams.get('from'));
    const start = connectedStart(from);
    return start
      ? ok({
          date: url.searchParams.get('date') ?? FIXTURE_TODAY,
          from,
          paths: pathsFrom(start),
        })
      : notFound();
  },
  '/home/toy': (url, state) => {
    // `kind`: a day outside the API's window asks for the kind it plans
    const kind =
      state.toy ??
      url.searchParams.get('kind') ??
      toyKindOfDay(url.searchParams.get('date') ?? '');
    const date = url.searchParams.get('date') ?? '';
    const fixture = TOYS[kind];
    const toy =
      fixture && (date >= LONG_TITLES_FROM || state.longTitles)
        ? withLongTitles(fixture)
        : fixture;
    return toy ? ok({ date: FIXTURE_TODAY, toy }) : notFound();
  },
  '/me/home/if-you-liked': () => ok(IF_YOU_LIKED),
};
