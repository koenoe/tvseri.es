import { NETWORK_ID_REDIRECTS } from './networkRedirects';
import { POSSIBLE_USERNAME } from './profileNotFound';

type Redirect = Readonly<{
  destination: string;
  permanent: boolean;
  source: string;
}>;

const USERNAME = `:username(${POSSIBLE_USERNAME})`;

/**
 * The profile's list pages became shelves of the Library and Social became
 * Circle. The username is held to what one can look like, so a junk handle
 * gets the static 404 in one hop instead of a redirect first.
 */
const PROFILE_REDIRECTS: ReadonlyArray<Redirect> = (
  [
    ['in-progress', 'library/watching'],
    ['watchlist', 'library/watchlist'],
    ['favorites', 'library/favourites'],
    ['finished', 'library/finished'],
    ['social', 'circle'],
  ] as const
).map(([from, to]) => ({
  destination: `/u/:username/${to}`,
  permanent: true,
  source: `/u/${USERNAME}/${from}`,
}));

/**
 * Old URLs that moved. Next passes the request's query through, so `?season=2`
 * survives every hop. Leading zeros on a show id are fixed here; a wrong or
 * missing slug by the show page's canonical redirect.
 */
export const REDIRECTS: ReadonlyArray<Redirect> = [
  { destination: '/', permanent: true, source: '/home' },
  // Show pages moved to the root. Non-numeric ids get no redirect and fall
  // through to the static 404 rewrite.
  {
    destination: '/:id/:rest*',
    permanent: true,
    source: '/tv/:id(\\d+)/:rest*',
  },
  // Show ids with leading zeros (`/0123/x`): one canonical URL per show, at
  // the edge with the query kept. A wrong or missing slug is the page's.
  {
    destination: '/:id/:rest*',
    permanent: true,
    source: '/:zeros(0+):id([1-9]\\d*)/:rest*',
  },
  // The track page became the history sheet on the show page. The sheet reads
  // `?history` (and `?season`) in the browser, so the page stays cached.
  {
    destination: '/:id/:rest*?history',
    permanent: true,
    source: '/track/:id(\\d+)/:rest*',
  },
  // Person ids with leading zeros (`/person/017419/x`): one canonical URL per
  // person, at the edge. A wrong or missing slug is the person page's.
  {
    destination: '/person/:id/:rest*',
    permanent: true,
    source: '/person/:zeros(0+):id([1-9]\\d*)/:rest*',
  },
  {
    destination: '/settings/plex',
    permanent: true,
    source: '/settings/webhooks',
  },
  // `/network/49` → `/network/hbo`: a landing's URL is its slug
  ...NETWORK_ID_REDIRECTS,
  ...PROFILE_REDIRECTS,
];
