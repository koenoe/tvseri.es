import { readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ROUTE_TEMPLATES, toRouteTemplate } from './routeTemplate';

const APP_DIR = path.resolve(import.meta.dirname, '../app');

/**
 * Every page route of the app router: route groups and parallel-route slots
 * (`@aside`, which mirror the pages' routes) flattened, private folders
 * skipped.
 */
function pageRoutes(dir: string, segments: readonly string[] = []): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isFile()) {
      return entry.name === 'page.tsx' ? [`/${segments.join('/')}`] : [];
    }
    if (!entry.isDirectory() || entry.name.startsWith('_')) {
      return [];
    }
    const isGroup =
      (entry.name.startsWith('(') && entry.name.endsWith(')')) ||
      entry.name.startsWith('@');
    return pageRoutes(
      path.join(dir, entry.name),
      isGroup ? segments : [...segments, entry.name],
    );
  });
}

describe('ROUTE_TEMPLATES', () => {
  it('lists exactly the page routes in src/app', () => {
    expect([...ROUTE_TEMPLATES].sort()).toEqual(
      [...new Set(pageRoutes(APP_DIR))].sort(),
    );
  });
});

describe('toRouteTemplate', () => {
  it.each([
    ['/', '/'],
    ['/1396', '/[id]/[[...slug]]'],
    ['/1396/breaking-bad', '/[id]/[[...slug]]'],
    ['/person/17419/bryan-cranston', '/person/[id]/[[...slug]]'],
    ['/person/17419', '/person/[id]/[[...slug]]'],
    ['/discover', '/discover'],
    ['/genre/drama', '/genre/[slug]'],
    ['/network/hbo', '/network/[slug]'],
    ['/country/gb', '/country/[slug]'],
    ['/decade/2010s', '/decade/[slug]'],
    ['/language/nl', '/language/[slug]'],
    ['/theme/time-travel', '/theme/[slug]'],
    ['/settings', '/settings'],
    ['/settings/plex', '/settings/plex'],
    ['/settings/streaming-services', '/settings/streaming-services'],
    ['/u/margaux', '/u/[username]'],
    ['/u/margaux/history', '/u/[username]/history'],
    ['/u/margaux/library', '/u/[username]/library'],
    ['/u/margaux/library/watchlist', '/u/[username]/library/watchlist'],
    ['/u/margaux/circle', '/u/[username]/circle'],
    ['/u/margaux/stats/2025', '/u/[username]/stats/[year]'],
  ])('maps %s to %s', (pathname, expected) => {
    expect(toRouteTemplate(pathname)).toBe(expected);
  });

  it('prefers a static segment over a dynamic one', () => {
    // `/u/[username]` would match `/u/settings` too; static routes win, as in Next.
    expect(toRouteTemplate('/settings/profile')).toBe('/settings/profile');
    expect(toRouteTemplate('/discover')).not.toBe('/[id]/[[...slug]]');
  });

  it.each(['/u', '/u/margaux/unknown', '/settings/nope/deeper'])(
    'keeps the pathname of a page that does not exist: %s',
    (pathname) => {
      expect(toRouteTemplate(pathname)).toBe(pathname);
    },
  );
});
