import type { NewRelease, NewThisWeek, TvSeries } from '@tvseri.es/schemas';

import { BOARD_TODAY, series } from './base.ts';
import { TRENDING } from './core.ts';
import { ok, type StubRoute } from './routes.ts';

/**
 * "New this week" (`GET /home/new-this-week`) on the boards' Wed 11 Nov: the
 * week's premieres, most popular first, the lead (the first with a backdrop)
 * first. It holds the cases the row draws: a new series that leads (logo),
 * a new season ("Season 3"), one with a backdrop but no logo, one without a
 * backdrop (never the lead), and the spotlight's first show, which Home
 * leaves out of the row.
 */

const release = (
  show: TvSeries,
  rank: number,
  fields: Partial<NewRelease> = {},
): NewRelease => ({
  date: '2026-11-09',
  kind: 'new-series',
  rank,
  seasonNumber: 1,
  series: show,
  ...fields,
});

const LIFES_STILL_UNFAIR = series({
  backdrop: 'pp_revival_bd.jpg',
  genre: 'Comedy',
  id: 940001,
  logo: 'pp_logo_revival.png',
  poster: 'pp_p_revival.jpg',
  title: 'Malcolm in the Middle: Life’s Still Unfair',
  year: '2026',
});

const SNEAKY_PETE = series({
  backdrop: 'pp_sneaky_bd.jpg',
  genre: 'Crime',
  id: 940002,
  poster: 'pp_p_sneaky.jpg',
  seasons: 3,
  title: 'Sneaky Pete',
  year: '2015',
});

const BILLIONS = series({
  backdrop: 'st_bd_billions.jpg',
  genre: 'Drama',
  id: 940003,
  logo: 'st_logo_billions.png',
  poster: 'st_p_billions.jpg',
  seasons: 8,
  title: 'Billions',
  year: '2016',
});

const YOUR_HONOR = series({
  genre: 'Drama',
  id: 940004,
  poster: 'pp_p_yh.jpg',
  seasons: 2,
  title: 'Your Honor',
  year: '2020',
});

const THE_BEAR = series({
  genre: 'Drama',
  id: 940005,
  poster: 'st_p_bear.jpg',
  seasons: 5,
  title: 'The Bear',
  year: '2022',
});

/** In rank order; the API sends the lead first, and here rank 1 has a backdrop */
const NEW_THIS_WEEK_ITEMS: ReadonlyArray<NewRelease> = [
  release(LIFES_STILL_UNFAIR, 1, { date: '2026-11-09' }),
  release(SNEAKY_PETE, 2, {
    date: '2026-11-06',
    kind: 'new-season',
    seasonNumber: 3,
  }),
  release(TRENDING[0]!, 3, {
    date: '2026-11-07',
    kind: 'new-season',
    seasonNumber: 2,
  }),
  release(BILLIONS, 4, {
    date: '2026-11-08',
    kind: 'new-season',
    seasonNumber: 8,
  }),
  release(YOUR_HONOR, 5, {
    date: '2026-11-10',
    kind: 'new-season',
    seasonNumber: 2,
  }),
  release(THE_BEAR, 6, {
    date: '2026-11-04',
    kind: 'new-season',
    seasonNumber: 5,
  }),
];

export const NEW_THIS_WEEK_ROUTES: Readonly<Record<string, StubRoute>> = {
  '/home/new-this-week': (url) =>
    ok({
      date: url.searchParams.get('date') ?? BOARD_TODAY,
      items: NEW_THIS_WEEK_ITEMS,
    } satisfies NewThisWeek),
};
