import { describe, expect, it } from 'vitest';

import { loginHref, type MenuItem, menuModel } from './menuItems';

const labels = (items: ReadonlyArray<MenuItem>) =>
  items.map((item) => item.label);

const current = (model: ReturnType<typeof menuModel>) =>
  [...model.watch, ...(model.you?.items ?? []), ...model.account]
    .filter((item) => item.current)
    .map((item) => item.label);

const viewer = (pathname: string) =>
  menuModel({ handle: 'margaux', pathname, year: 2026 });

describe('loginHref', () => {
  it('returns to the current page after signing in', () => {
    expect(loginHref('/1396/breaking-bad?season=2')).toBe(
      '/api/auth/login?returnTo=%2F1396%2Fbreaking-bad%3Fseason%3D2',
    );
  });

  it('returns home from the root', () => {
    expect(loginHref('/')).toBe('/api/auth/login?returnTo=%2F');
  });
});

describe('menuModel: content per viewer', () => {
  it('signed out: Watch (Home, Discover), then Sign in', () => {
    const model = menuModel({
      handle: null,
      pathname: '/',
      year: 2026,
    });
    expect(labels(model.watch)).toEqual(['Home', 'Discover']);
    expect(model.you).toBeNull();
    expect(model.account).toEqual([]);
    expect(model.signIn).toEqual({
      current: false,
      id: 'signIn',
      kind: 'signIn',
      label: 'Sign in',
    });
  });

  it('signed in: Watch, You · @handle (four pages), the account line', () => {
    const model = viewer('/');
    expect(labels(model.watch)).toEqual(['Home', 'Discover']);
    expect(model.you?.handle).toBe('margaux');
    expect(model.you?.items).toEqual([
      {
        current: false,
        href: '/u/margaux',
        id: 'overview',
        kind: 'link',
        label: 'Overview',
      },
      {
        current: false,
        href: '/u/margaux/library',
        id: 'library',
        kind: 'link',
        label: 'Library',
      },
      {
        current: false,
        href: '/u/margaux/history',
        id: 'history',
        kind: 'link',
        label: 'History',
      },
      {
        current: false,
        href: '/u/margaux/stats/2026',
        id: 'stats',
        kind: 'link',
        label: 'Stats',
      },
    ]);
    expect(labels(model.account)).toEqual(['Settings', 'Sign out']);
    expect(model.account[1]?.kind).toBe('signOut');
    expect(model.signIn).toBeNull();
  });

  it('never lists Circle', () => {
    const all = [
      ...viewer('/').watch,
      ...(viewer('/').you?.items ?? []),
      ...viewer('/').account,
    ];
    expect(labels(all)).not.toContain('Circle');
    expect(all.some((item) => 'href' in item && /circle/.test(item.href))).toBe(
      false,
    );
  });

  it('has Settings and Sign out in the account line, no Dashboard', () => {
    expect(labels(viewer('/').account)).toEqual(['Settings', 'Sign out']);
  });

  it('signed out, the account line is empty', () => {
    const model = menuModel({
      handle: null,
      pathname: '/',
      year: 2026,
    });
    expect(model.account).toEqual([]);
  });

  it('encodes the handle in its links', () => {
    const model = menuModel({
      handle: 'a b',
      pathname: '/',
      year: 2026,
    });
    expect(model.you?.items[0]).toMatchObject({ href: '/u/a%20b' });
  });
});

describe('menuModel: the current page', () => {
  it.each([
    ['/', ['Home']],
    ['/discover', ['Discover']],
    ['/discover/new', ['Discover']],
    ['/u/margaux', ['Overview']],
    ['/u/margaux/', ['Overview']],
    ['/u/margaux/library', ['Library']],
    ['/u/margaux/library/watchlist', ['Library']],
    ['/u/margaux/history', ['History']],
    ['/u/margaux/stats/2024', ['Stats']],
    ['/u/Margaux/library', ['Library']],
    ['/settings', ['Settings']],
    ['/settings/plex', ['Settings']],
  ])('%s marks %j', (pathname, expected) => {
    expect(current(viewer(pathname))).toEqual(expected);
  });

  it.each([
    '/1396/breaking-bad',
    '/discovery',
    '/genre/crime',
    '/u/margaux/circle',
    '/u/margauxx/library',
    '/u/someone-else',
    '/u/someone-else/library',
    '/settingsx',
  ])('%s marks nothing', (pathname) => {
    expect(current(viewer(pathname))).toEqual([]);
  });

  it('marks Home for a signed-out viewer too', () => {
    const model = menuModel({
      handle: null,
      pathname: '/',
      year: 2026,
    });
    expect(model.watch.map((item) => item.current)).toEqual([true, false]);
  });
});
