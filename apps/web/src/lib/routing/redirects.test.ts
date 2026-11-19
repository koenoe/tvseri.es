import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { prepareDestination } from 'next/dist/shared/lib/router/utils/prepare-destination';
import { describe, expect, it } from 'vitest';

import { REDIRECTS } from './redirects';

/**
 * Runs a URL through the redirect table with Next's own matcher, the way
 * `next start` does, and returns where it ends up (or null for no redirect).
 * The e2e suite checks the same rows as real requests on a production build.
 */
function resolveRedirect(url: string) {
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  const query = Object.fromEntries(searchParams);
  for (const rule of REDIRECTS) {
    const match = getPathMatch(rule.source, {
      removeUnnamedParams: true,
      strict: true,
    });
    const params = match(pathname);
    if (!params) {
      continue;
    }
    const { parsedDestination } = prepareDestination({
      appendParamsToQuery: false,
      destination: rule.destination,
      params,
      query,
    });
    const search = new URLSearchParams(
      parsedDestination.query as Record<string, string>,
    ).toString();
    return {
      location: `${parsedDestination.pathname}${search ? `?${search}` : ''}`,
      permanent: rule.permanent,
    };
  }
  return null;
}

describe('redirects', () => {
  it('sends /home to /', () => {
    expect(resolveRedirect('/home')).toEqual({
      location: '/',
      permanent: true,
    });
  });

  it('moves show pages from /tv/{id} to /{id}, slug or not', () => {
    expect(resolveRedirect('/tv/1396')).toEqual({
      location: '/1396',
      permanent: true,
    });
    expect(resolveRedirect('/tv/1396/breaking-bad')).toEqual({
      location: '/1396/breaking-bad',
      permanent: true,
    });
  });

  it('keeps the query and any deeper path on /tv', () => {
    expect(resolveRedirect('/tv/1396/breaking-bad?season=2&episode=6')).toEqual(
      { location: '/1396/breaking-bad?season=2&episode=6', permanent: true },
    );
    expect(resolveRedirect('/tv/1396/breaking-bad/extra')?.location).toBe(
      '/1396/breaking-bad/extra',
    );
  });

  it('leaves non-numeric /tv ids to the static 404', () => {
    expect(resolveRedirect('/tv/abc')).toBeNull();
    expect(resolveRedirect('/tv/12a')).toBeNull();
  });

  it('opens the history sheet for old /track links, keeping the season', () => {
    expect(resolveRedirect('/track/1396/breaking-bad')).toEqual({
      location: '/1396/breaking-bad?history=',
      permanent: true,
    });
    expect(resolveRedirect('/track/1396')?.location).toBe('/1396?history=');
    expect(resolveRedirect('/track/1396/breaking-bad?season=2')?.location).toBe(
      '/1396/breaking-bad?season=2&history=',
    );
  });

  it('drops leading zeros from a show id, keeping the slug and query', () => {
    expect(resolveRedirect('/0136315/the-bear?season=2&episode=6')).toEqual({
      location: '/136315/the-bear?season=2&episode=6',
      permanent: true,
    });
    expect(resolveRedirect('/00123')?.location).toBe('/123');
    expect(resolveRedirect('/0')).toBeNull();
    expect(resolveRedirect('/123/x')).toBeNull();
  });

  it('sends the old webhooks and plex settings pages to connected apps', () => {
    for (const old of ['/settings/webhooks', '/settings/plex']) {
      expect(resolveRedirect(old)).toEqual({
        location: '/settings/connected-apps',
        permanent: true,
      });
    }
  });

  it('drops leading zeros from a person id, slug and all', () => {
    expect(resolveRedirect('/person/017419/bryan-cranston')).toEqual({
      location: '/person/17419/bryan-cranston',
      permanent: true,
    });
    expect(resolveRedirect('/person/0017419')).toEqual({
      location: '/person/17419',
      permanent: true,
    });
    expect(resolveRedirect('/person/0')).toBeNull();
  });

  it.each([
    ['/u/nina/in-progress', '/u/nina/library/watching'],
    ['/u/nina/watchlist', '/u/nina/library/watchlist'],
    ['/u/nina/favorites', '/u/nina/library/favourites'],
    ['/u/nina/finished', '/u/nina/library/finished'],
    ['/u/nina/social', '/u/nina/circle'],
    ['/u/Nina_R/finished', '/u/Nina_R/library/finished'],
    ['/u/n%20ina/watchlist', '/u/n%20ina/library/watchlist'],
  ])('moves the old profile page %s to its new URL', (from, to) => {
    expect(resolveRedirect(from)).toEqual({ location: to, permanent: true });
  });

  it('keeps the query on a moved profile list', () => {
    expect(resolveRedirect('/u/nina/watchlist?sort=oldest')?.location).toBe(
      '/u/nina/library/watchlist?sort=oldest',
    );
  });

  it('leaves junk handles and deeper paths to the static 404', () => {
    expect(resolveRedirect('/u/n!na/watchlist')).toBeNull();
    expect(resolveRedirect('/u/ab/watchlist')).toBeNull();
    expect(resolveRedirect('/u/nina/watchlist/x')).toBeNull();
  });

  it('does not redirect the new URLs', () => {
    for (const url of [
      '/',
      '/1396/breaking-bad',
      '/discover',
      '/settings',
      '/settings/connected-apps',
      '/u/margaux',
      '/u/margaux/history',
      '/u/margaux/library',
      '/u/margaux/library/watchlist',
      '/u/margaux/circle',
      '/person/17419',
    ]) {
      expect(resolveRedirect(url)).toBeNull();
    }
  });
});
