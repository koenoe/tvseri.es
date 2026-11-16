import { describe, expect, it } from 'vitest';

import {
  isValidTmdbEndpoint,
  normalizeDependencyEndpoint,
} from './dependencyEndpoint';

// Pinned on path-to-regexp 8 before the move to 9 (ESM only; ambiguous
// matches turned non-greedy; no extra optional trailing delimiter after an
// explicit one). Every pattern here has one parameter per segment, so the
// output must not change. Quirks are pinned on purpose: a TMDB list keyword
// (`/3/tv/popular`) folds into `:id`, and a path past the deepest pattern
// is kept as it is.

/** [endpoint, kept by the TMDB id check, normalized] */
const TMDB: ReadonlyArray<readonly [string, boolean, string]> = [
  ['/3/tv/1399', true, '/3/tv/:id'],
  ['/3/tv/1399/', true, '/3/tv/:id'],
  ['/3/tv/1399/images', true, '/3/tv/:id/images'],
  ['/3/tv/1399/watch/providers', true, '/3/tv/:id/watch/providers'],
  ['/3/tv/1399/season/2', true, '/3/tv/:id/season/:num'],
  ['/3/tv/1399/season/2/', true, '/3/tv/:id/season/:num'],
  ['/3/tv/1399/season/2/images', true, '/3/tv/:id/season/:num/images'],
  ['/3/tv/1399/season/2/episode/5', true, '/3/tv/:id/season/:num/episode/:num'],
  [
    '/3/tv/1399/season/2/episode/5/images',
    true,
    '/3/tv/:id/season/:num/episode/:num/images',
  ],
  [
    '/3/tv/1399/season/2/episode/5/images/extra',
    true,
    '/3/tv/1399/season/2/episode/5/images/extra',
  ],
  ['/3/tv/popular', true, '/3/tv/:id'],
  ['/3/tv/airing_today', true, '/3/tv/:id'],
  ['/3/tv/abc', false, '/3/tv/:id'],
  ['/3/tv/abc/images', false, '/3/tv/:id/images'],
  ['/3/movie/550/credits', true, '/3/movie/:id/credits'],
  ['/3/person/287', true, '/3/person/:id'],
  ['/3/find/tt0944947', true, '/3/find/:id'],
  ['/3/find/tt0944947/', true, '/3/find/:id'],
  ['/3/search/tv', true, '/3/search/tv'],
  ['/3/discover/tv', true, '/3/discover/tv'],
  ['/3/genre/tv/list', true, '/3/genre/tv/list'],
  ['/3/trending/tv/week', true, '/3/trending/tv/week'],
  ['/3/configuration', true, '/3/configuration'],
  ['/3/tv/1399.json', false, '/3/tv/:id'],
  ['/3/tv/12%2034', false, '/3/tv/:id'],
  ['/3/tv/%E2%9C%93', false, '/3/tv/:id'],
  ['/3/tv', true, '/3/tv'],
  ['/3/tv//images', true, '/3/tv//images'],
  ['/3', true, '/3'],
  ['/', true, '/'],
  ['/3/credit/52fe', true, '/3/credit/:id'],
  ['/3/review/abc123', true, '/3/review/:id'],
  [
    '/3/tv/1399/season/2/episode/5/a/b',
    true,
    '/3/tv/1399/season/2/episode/5/a/b',
  ],
  ['/3/tv/1399/season/x', true, '/3/tv/:id/season/:num'],
  ['/3/tv/1399/season/2/episode/x', true, '/3/tv/:id/season/:num/episode/:num'],
];

/** [endpoint, normalized] */
const MDBLIST: ReadonlyArray<readonly [string, string]> = [
  ['/lists/user/123', '/lists/user/:id'],
  ['/lists/user/someone', '/lists/user/:username'],
  ['/lists/someone/my-list/items', '/lists/:user/:list/items'],
  ['/lists/123/items', '/lists/:id/items'],
  ['/lists/123/456/items', '/lists/123/456/items'],
  ['/lists/someone/my-list', '/lists/:user/:list'],
  ['/lists/123', '/lists/:id'],
  ['/lists/abc', '/lists/abc'],
  ['/external/lists/123', '/external/lists/:id'],
  ['/external/lists/abc', '/external/lists/abc'],
  ['/tmdb/show/1399', '/tmdb/show/:id'],
  ['/imdb/movie/tt0944947', '/imdb/movie/:id'],
  ['/foo/show/1', '/foo/show/1'],
  ['/tmdb/tv/1', '/tmdb/tv/1'],
  ['/lists/user/123/', '/lists/user/:id'],
  ['/lists/someone/my-list/items/', '/lists/:user/:list/items'],
  ['/tmdb/show/1399.json', '/tmdb/show/:id'],
  ['/lists/a%20b/c/items', '/lists/:user/:list/items'],
];

describe('TMDB dependency endpoints', () => {
  it.each(TMDB)(
    '%s: kept %s, normalized to %s',
    (endpoint, kept, normalized) => {
      expect(isValidTmdbEndpoint(endpoint)).toBe(kept);
      expect(normalizeDependencyEndpoint('TMDB', endpoint)).toBe(normalized);
    },
  );
});

describe('MDBList dependency endpoints', () => {
  it.each(MDBLIST)('%s: normalized to %s', (endpoint, normalized) => {
    expect(normalizeDependencyEndpoint('mdblist', endpoint)).toBe(normalized);
  });
});

describe('other dependencies', () => {
  it('keeps DynamoDB and unknown sources as they are', () => {
    expect(normalizeDependencyEndpoint('dynamodb', '/3/tv/1')).toBe('/3/tv/1');
    expect(normalizeDependencyEndpoint('omdb', '/3/tv/1')).toBe('/3/tv/1');
  });
});
