import { expect, test } from '@playwright/test';

/**
 * Real, no-follow requests against the production build: the status and
 * Location of each old URL, one case per rule. Leading zeros on a show id
 * are a config redirect too; the show page's own slug redirect is tested in
 * `show.spec.ts`.
 */
const REDIRECTS: ReadonlyArray<readonly [from: string, to: string]> = [
  ['/home', '/'],
  ['/tv/1396', '/1396'],
  [
    '/tv/1396/breaking-bad?season=2&episode=6',
    '/1396/breaking-bad?season=2&episode=6',
  ],
  ['/tv/1396/wrong-slug', '/1396/wrong-slug'],
  ['/tv/0123/x', '/0123/x'],
  ['/track/1396', '/1396?history='],
  ['/track/1396/breaking-bad?season=2', '/1396/breaking-bad?season=2&history='],
  ['/settings/webhooks', '/settings/connected-apps'],
  // Leading zeros on a show id, at the edge with the query kept
  [
    '/0136315/the-bear?season=2&episode=6',
    '/136315/the-bear?season=2&episode=6',
  ],
  // Old filter-grid links: one lens to its landing, anything else to the hub
  ['/discover?with_genres=80', '/genre/crime'],
  ['/discover?with_networks=49&sort_by=vote_average.desc', '/network/hbo'],
  // any keyword of a theme's set; a genre TMDB keeps as a keyword
  ['/discover?with_keywords=10854', '/theme/time-travel'],
  ['/discover?with_keywords=9840', '/genre/romance'],
  ['/discover?with_origin_country=GB', '/country/gb'],
  ['/discover?with_original_language=ja', '/language/ja'],
  [
    '/discover?first_air_date.gte=2010-01-01&first_air_date.lte=2019-12-31',
    '/decade/2010s',
  ],
  ['/discover?with_genres=80&utm_source=newsletter&fbclid=x', '/genre/crime'],
  ['/discover?with_genres=80,18', '/discover'],
  ['/discover?with_watch_providers=8&watch_region=GB', '/discover'],
  // The profile's list pages became Library shelves, query kept
  ['/u/alex/in-progress', '/u/alex/library/watching'],
  ['/u/alex/watchlist?sort=oldest', '/u/alex/library/watchlist?sort=oldest'],
  ['/u/alex/favorites', '/u/alex/library/favourites'],
  ['/u/alex/social', '/u/alex/circle'],
];

test('every old URL redirects permanently to its new one', async ({
  request,
}) => {
  for (const [from, to] of REDIRECTS) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect.soft(response.status(), from).toBe(308);
    expect.soft(response.headers().location, from).toBe(to);
  }
});

// A handle that can't exist is the static 404 at once, not a redirect first
test('a junk handle on an old list URL is the static 404', async ({
  request,
}) => {
  const response = await request.get('/u/n!na/watchlist', { maxRedirects: 0 });
  expect(response.status()).toBe(404);
});
