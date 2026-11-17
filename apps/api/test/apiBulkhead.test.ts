import { describe, expect, it } from 'vitest';

import { API_WRITE_ROUTES } from '../../../infra/apiWriteRoutes';
import app from '../src/app';
import { runEdge } from './edge';
import { API_KEY } from './request';

/**
 * The API bulkhead (infra/apiWriteRoutes.ts): which function every route
 * reaches at the edge. A route added to the app fails here until it's put in
 * this table, so nothing is routed by accident.
 */

type Target = 'catalogue' | 'write';

const ROUTES: Readonly<Record<string, Target>> = {
  'DELETE /admin/preferred-images/series/:id{[0-9]+}': 'catalogue',
  'DELETE /me': 'write',
  'DELETE /me/imports/:importId': 'write',
  'DELETE /user/:id/list/:list{favorites|in_progress|watchlist}/:itemId{[0-9]+}':
    'write',
  'DELETE /user/:id/unfollow': 'write',
  'DELETE /user/:id/watched/series/:series-id{[0-9]+}': 'write',
  'DELETE /user/:id/watched/series/:series-id{[0-9]+}/season/:season{[0-9]+}':
    'write',
  'DELETE /user/:id/watched/series/:series-id{[0-9]+}/season/:season{[0-9]+}/episode/:episode{[0-9]+}':
    'write',
  'DELETE /webhook/type/:type{plex}': 'write',
  'GET /collection/most-popular-this-month': 'catalogue',
  'GET /collection/top-rated': 'catalogue',
  'GET /collection/trending': 'catalogue',
  'GET /discover': 'catalogue',
  'GET /discover/countries': 'catalogue',
  'GET /discover/go-deeper': 'catalogue',
  'GET /discover/landing/:type{genre|theme|network|country|decade|language}/:slug{[A-Za-z0-9-]+}/facts':
    'catalogue',
  'GET /discover/landing/:type/counts': 'catalogue',
  'GET /discover/languages': 'catalogue',
  'GET /discover/watch-providers': 'catalogue',
  'GET /dominant-color': 'catalogue',
  'GET /duration': 'catalogue',
  'GET /duration/:bucket': 'catalogue',
  'GET /duration/weekend': 'catalogue',
  'GET /duration/where-to-start': 'catalogue',
  'GET /genres': 'catalogue',
  'GET /home/connected': 'catalogue',
  'GET /home/feature': 'catalogue',
  'GET /home/hidden-gems': 'catalogue',
  'GET /home/new-this-week': 'catalogue',
  'GET /home/toy': 'catalogue',
  'GET /keyword/:id{[0-9]+}': 'catalogue',
  'GET /keyword/*': 'catalogue',
  'GET /me': 'write',
  'GET /me/circle': 'catalogue',
  'GET /me/circle/people': 'catalogue',
  'GET /me/export/everything.json': 'catalogue',
  'GET /me/export/history.csv': 'catalogue',
  'GET /me/get-started': 'catalogue',
  'GET /me/home/because-you-watched': 'catalogue',
  'GET /me/home/if-you-liked': 'catalogue',
  'GET /me/home/more-genre': 'catalogue',
  'GET /me/home/spotlight-lines': 'catalogue',
  'GET /me/ledger': 'catalogue',
  'GET /me/ledger/:id': 'catalogue',
  'GET /me/library-ids': 'write',
  'GET /me/member': 'catalogue',
  'GET /me/overview': 'catalogue',
  'GET /me/person/:id/watched': 'catalogue',
  // Reads series facts (TMDB on a cold miss), like the overview
  'GET /me/series-states': 'catalogue',
  'GET /me/series/:id/prefs': 'write',
  'GET /me/series/:id/status': 'write',
  'GET /me/waiting-for': 'catalogue',
  'GET /metrics/api': 'catalogue',
  'GET /metrics/api/countries': 'catalogue',
  'GET /metrics/api/countries/:country': 'catalogue',
  'GET /metrics/api/dependencies': 'catalogue',
  'GET /metrics/api/dependencies/:source': 'catalogue',
  'GET /metrics/api/endpoints': 'catalogue',
  'GET /metrics/api/endpoints/:endpoint': 'catalogue',
  'GET /metrics/api/platforms': 'catalogue',
  'GET /metrics/api/platforms/:platform': 'catalogue',
  'GET /metrics/web-vitals/countries': 'catalogue',
  'GET /metrics/web-vitals/countries/:country': 'catalogue',
  'GET /metrics/web-vitals/devices': 'catalogue',
  'GET /metrics/web-vitals/devices/:device': 'catalogue',
  'GET /metrics/web-vitals/routes': 'catalogue',
  'GET /metrics/web-vitals/routes/:route': 'catalogue',
  'GET /metrics/web-vitals/summary': 'catalogue',
  'GET /network/:id{[0-9]{1,10}}': 'catalogue',
  'GET /network/*': 'catalogue',
  'GET /person/:id{[0-9]{1,10}}': 'catalogue',
  'GET /person/:id{[0-9]{1,10}}/career': 'catalogue',
  'GET /person/:id{[0-9]{1,10}}/collaborators': 'catalogue',
  'GET /person/:id{[0-9]{1,10}}/credits': 'catalogue',
  'GET /person/:id{[0-9]{1,10}}/external-ids': 'catalogue',
  'GET /person/:id{[0-9]{1,10}}/family-and-awards': 'catalogue',
  'GET /person/:id{[0-9]{1,10}}/known-for': 'catalogue',
  'GET /person/:id{[0-9]{1,10}}/shows': 'catalogue',
  'GET /person/*': 'catalogue',
  'GET /popular/:year{[0-9]{4}}?': 'catalogue',
  'GET /popular/*': 'catalogue',
  'GET /premieres': 'catalogue',
  'GET /search': 'catalogue',
  'GET /search/keyword': 'catalogue',
  'GET /search/series': 'catalogue',
  'GET /series/:id{[0-9]+}': 'catalogue',
  'GET /series/:id{[0-9]+}/content-rating': 'catalogue',
  'GET /series/:id{[0-9]+}/credits': 'catalogue',
  'GET /series/:id{[0-9]+}/images': 'catalogue',
  'GET /series/:id{[0-9]+}/keywords': 'catalogue',
  'GET /series/:id{[0-9]+}/rating': 'catalogue',
  'GET /series/:id{[0-9]+}/recommendations': 'catalogue',
  'GET /series/:id{[0-9]+}/runtimes': 'catalogue',
  'GET /series/:id{[0-9]+}/season/:season{[0-9]+}': 'catalogue',
  'GET /series/:id{[0-9]+}/season/:season{[0-9]+}/episode/:episode{[0-9]+}':
    'catalogue',
  'GET /series/:id{[0-9]+}/season/:season{[0-9]+}/ratings': 'catalogue',
  'GET /series/:id{[0-9]+}/similar': 'catalogue',
  'GET /series/:id{[0-9]+}/watch-providers': 'catalogue',
  'GET /series/*': 'catalogue',
  'GET /series/romanized-titles': 'catalogue',
  'GET /series/summaries': 'catalogue',
  'GET /user/:id': 'catalogue',
  'GET /user/:id/follower/:other': 'catalogue',
  'GET /user/:id/followers': 'catalogue',
  'GET /user/:id/followers/count': 'catalogue',
  'GET /user/:id/following': 'catalogue',
  'GET /user/:id/following/:other': 'catalogue',
  'GET /user/:id/following/count': 'catalogue',
  'GET /user/:id/library': 'catalogue',
  'GET /user/:id/library/:shelf{watching|watchlist|finished|favourites|all|hidden}':
    'catalogue',
  'GET /user/:id/list-status/:series-id{[0-9]+}': 'write',
  // `?include=facts` reads series facts, so the list page stays on catalogue
  'GET /user/:id/list/:list{favorites|in_progress|resuming_soon|watched|watchlist}':
    'catalogue',
  'GET /user/:id/list/:list{favorites|in_progress|resuming_soon|watched|watchlist}/:item-id{[0-9]+}':
    'write',
  'GET /user/:id/list/:list{favorites|in_progress|resuming_soon|watched|watchlist}/count':
    'write',
  'GET /user/:id/match': 'catalogue',
  'GET /user/:id/overview': 'catalogue',
  'GET /user/:id/stats/:year/countries': 'catalogue',
  'GET /user/:id/stats/:year/daily': 'catalogue',
  'GET /user/:id/stats/:year/favorites-count': 'catalogue',
  'GET /user/:id/stats/:year/finished': 'catalogue',
  'GET /user/:id/stats/:year/genres': 'catalogue',
  'GET /user/:id/stats/:year/new-or-back': 'catalogue',
  'GET /user/:id/stats/:year/providers': 'catalogue',
  'GET /user/:id/stats/:year/shows': 'catalogue',
  'GET /user/:id/stats/:year/spotlight': 'catalogue',
  'GET /user/:id/stats/:year/summary': 'catalogue',
  'GET /user/:id/stats/:year/watched-series': 'catalogue',
  'GET /user/:id/stats/:year/weekly': 'catalogue',
  'GET /user/:id/stats/:year/when': 'catalogue',
  'GET /user/:id/stats/years': 'catalogue',
  'GET /user/:id/stats/zone': 'catalogue',
  'GET /user/:id/watched': 'write',
  'GET /user/:id/watched/count': 'write',
  'GET /user/:id/watched/runtime': 'write',
  'GET /user/:id/watched/series/:series-id{[0-9]+}': 'write',
  'GET /user/by-username/:username': 'catalogue',
  'GET /webhook/type/:type{plex}': 'catalogue',
  'GET /webhook/type/:type{plex}/status': 'catalogue',
  'PATCH /me/series/:id/prefs': 'write',
  'PATCH /webhook/type/:type{plex}': 'write',
  'POST /me/imports': 'write',
  'POST /me/imports/:importId/batch': 'write',
  'POST /me/imports/check': 'write',
  // Beacons: a flood of them must not take the write function's capacity
  'POST /metrics/web-vitals': 'catalogue',
  'POST /scrobble/provider/:provider': 'write',
  'POST /user/:id/follow': 'write',
  'POST /user/:id/list/:list{favorites|watchlist}': 'write',
  'POST /user/:id/watched/batch': 'write',
  'POST /user/:id/watched/batch/delete': 'write',
  'POST /user/:id/watched/series/:series-id{[0-9]+}': 'write',
  'POST /user/:id/watched/series/:series-id{[0-9]+}/season/:season{[0-9]+}':
    'write',
  'POST /user/:id/watched/series/:series-id{[0-9]+}/season/:season{[0-9]+}/episode/:episode{[0-9]+}':
    'write',
  'POST /webhook/type/:type{plex}': 'write',
  'PUT /admin/preferred-images/series/:id{[0-9]+}': 'catalogue',
  'PUT /me': 'write',
  'PUT /me/watch-providers': 'write',
};

const WRITE_HOST = 'write-fn.lambda-url.eu-west-2.on.aws';
const KV = { [API_WRITE_ROUTES.kvKey]: WRITE_HOST };
const HOST = 'api.tvseri.es';

// Values that fit each kind of path parameter, tried in order
const SAMPLES = [
  '1',
  '2026',
  'plex',
  'favorites',
  'watching',
  'genre',
  'drama',
  'ABC1',
];
const NAMED_SAMPLES: Readonly<Record<string, string>> = {
  id: '1',
  importId: '0b9b9c2e-3f0a-4f4e-9f53-2d4c4c1f6a11',
  token: 'a'.repeat(24),
  username: 'someone',
};

// `/series/:id{[0-9]+}/season/:season{[0-9]+}` → `/series/1/season/1`
const samplePath = (pattern: string) =>
  pattern
    .replace(/:([\w-]+)(?:\{((?:[^{}]|\{[^{}]*\})+)\})?\??/g, (_, name, re) => {
      if (!re) {
        return NAMED_SAMPLES[name] ?? 'x1';
      }
      const fits = SAMPLES.find((value) =>
        new RegExp(`^(?:${re})$`).test(value),
      );
      if (!fits) {
        throw new Error(`No sample for :${name}{${re}}`);
      }
      return fits;
    })
    .replace(/\*$/, 'anything');

const appRoutes = [
  ...new Set(
    app.routes
      .filter((route) => route.method !== 'ALL')
      .map((route) => `${route.method} ${route.path}`),
  ),
].sort();

const route = (
  method: string,
  path: string,
  kv: Readonly<Record<string, string>> = KV,
) =>
  runEdge({
    headers: { host: HOST, 'x-api-key': API_KEY },
    kv,
    method,
    path,
  });

const targetOf = async (method: string, path: string) => {
  const result = await route(method, path);
  return result.outcome === 'origin' ? 'write' : 'catalogue';
};

describe('API bulkhead', () => {
  it('has every route of the app in the table, and nothing else', () => {
    expect(appRoutes).toEqual(Object.keys(ROUTES).sort());
  });

  it.each(appRoutes)('%s', async (key) => {
    const [method, pattern] = key.split(' ') as [string, string];
    expect(await targetOf(method, samplePath(pattern))).toBe(ROUTES[key]);
  });

  // Marks still look series and episodes up on TMDB until they read cached
  // show data (another branch); they are on the write function either way
  it('puts every mark and unmark on the write function: episode, season, show and bulk', async () => {
    const series = '/user/u_1/watched/series/1';
    const marks = [
      ['POST', series],
      ['DELETE', series],
      ['POST', `${series}/season/2`],
      ['DELETE', `${series}/season/2`],
      ['POST', `${series}/season/2/episode/3`],
      ['DELETE', `${series}/season/2/episode/3`],
      ['POST', '/user/u_1/watched/batch'],
      ['POST', '/user/u_1/watched/batch/delete'],
    ] as const;
    for (const [method, path] of marks) {
      expect(await targetOf(method, path), `${method} ${path}`).toBe('write');
    }
  });

  it('routes HEAD like GET', async () => {
    expect(await targetOf('HEAD', '/me')).toBe('write');
    expect(await targetOf('HEAD', '/series/1')).toBe('catalogue');
  });

  it('leaves OPTIONS on the default route', async () => {
    expect(await targetOf('OPTIONS', '/me')).toBe('catalogue');
    expect(await targetOf('OPTIONS', '/user/u_1/watched/batch')).toBe(
      'catalogue',
    );
  });

  it('keeps dot segments on the default route', async () => {
    expect(await targetOf('GET', '/user/u_1/watched/../../../person/1')).toBe(
      'catalogue',
    );
    expect(await targetOf('POST', '/me/%2e%2e/series/1')).toBe('catalogue');
  });

  it('sends everything to the default route until the write origin is in the store', async () => {
    for (const key of appRoutes) {
      const [method, pattern] = key.split(' ') as [string, string];
      const result = await route(method, samplePath(pattern), {});
      expect(result.outcome, key).toBe('default');
    }
  });

  it('leaves the CloudFront default domain to SST, which blocks it', async () => {
    const result = await runEdge({
      headers: { host: 'd111.cloudfront.net', 'x-api-key': API_KEY },
      kv: KV,
      method: 'POST',
      path: '/user/u_1/watched/batch',
    });
    expect(result.outcome).toBe('default');
  });

  it('sets the write origin the way SST sets a function URL origin', async () => {
    const result = await route('POST', '/user/u_1/watched/batch');
    expect(result.origin).toEqual({
      customOriginConfig: {
        port: 443,
        protocol: 'https',
        sslProtocols: ['TLSv1.2'],
      },
      domainName: WRITE_HOST,
      originAccessControlConfig: { enabled: false },
    });
    // Lambda URLs read the viewer's host from x-forwarded-host (SST does the same)
    expect(result.request.headers['x-forwarded-host']).toEqual({ value: HOST });
  });

  // One cache behaviour serves the whole API: the cache key is the path, the
  // query string and Origin. Routing must not touch any of them.
  it('keeps what the cache key is made of', async () => {
    const result = await runEdge({
      headers: {
        host: HOST,
        origin: 'https://www.tvseri.es',
        'x-api-key': API_KEY,
      },
      kv: KV,
      method: 'GET',
      path: '/user/u_1/watched/series/1',
      query: { view: 'progress' },
    });
    expect(result.outcome).toBe('origin');
    expect(result.request.uri).toBe('/user/u_1/watched/series/1');
    expect(result.request.querystring).toEqual({ view: { value: 'progress' } });
    expect(result.request.headers.origin).toEqual({
      value: 'https://www.tvseri.es',
    });
  });

  it('still refuses a write without the API key', async () => {
    const result = await runEdge({
      headers: { host: HOST },
      kv: KV,
      method: 'POST',
      path: '/user/u_1/watched/batch',
    });
    expect(result.outcome).toBe('unauthorized');
  });
});
