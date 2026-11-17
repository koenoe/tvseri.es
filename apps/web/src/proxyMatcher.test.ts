import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { unstable_doesMiddlewareMatch as doesProxyMatch } from 'next/experimental/testing/server';
import { describe, expect, it } from 'vitest';

import { SESSION_COOKIE_NAME } from './auth/cookies';
import { config } from './proxy';

/**
 * The proxy is the only place a session is refreshed; route handlers read the
 * cookie it forwards (`auth(req)`, `getViewer(req)` are read-only). So every
 * route handler that reads the session must be in the proxy's matcher, or it
 * would see an expired token as signed out. (`unstable_doesProxyMatch` in the
 * docs is still exported as `unstable_doesMiddlewareMatch` in Next 16.4.)
 */

const API_DIR = path.join(import.meta.dirname, 'app', 'api');
// a direct read, or a handler on `viewerRoute` (`app/api/handlers.ts`)
const READS_SESSION = /\b(?:auth|getViewer)\(req\b|\bviewerRoute\(/;
/** The adapter itself is no route */
const ADAPTER = path.join(API_DIR, 'handlers.ts');

function sessionReadingFiles(dir: string): ReadonlyArray<string> {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sessionReadingFiles(file);
    }
    return /\.tsx?$/.test(entry.name) &&
      !entry.name.includes('.test.') &&
      file !== ADAPTER &&
      READS_SESSION.test(readFileSync(file, 'utf8'))
      ? [file]
      : [];
  });
}

/** `src/app/api/u/[username]/watched/route.ts` → `/api/u/x/watched`. */
const toUrl = (file: string) =>
  `/${path
    .relative(path.join(import.meta.dirname, 'app'), path.dirname(file))
    .split(path.sep)
    .map((segment) => (segment.startsWith('[') ? 'x' : segment))
    .join('/')}`;

const withSession = { [SESSION_COOKIE_NAME]: 'cookie' };

describe('proxy matcher', () => {
  const urls = sessionReadingFiles(API_DIR).map(toUrl);

  it('finds the session-reading route handlers', () => {
    expect(urls).toEqual(
      expect.arrayContaining([
        '/api/me/library-ids',
        '/api/me/series/x',
        '/api/region',
        '/api/u/x/watched',
      ]),
    );
  });

  it.each(urls)('runs before %s, which reads the session', (url) => {
    expect(doesProxyMatch({ config, cookies: withSession, url })).toBe(true);
  });

  // Vercel runs the proxy before its CDN cache: an image that reads no
  // session would cost a function run per signed-in view for nothing
  it.each(['/u/juno/stats/2025/card', '/u/juno/stats/2025/opengraph-image'])(
    'skips the public Stats image %s, signed in too',
    (url) => {
      expect(doesProxyMatch({ config, cookies: withSession, url })).toBe(false);
      const display = { __tvseries_user: 'juno' };
      expect(doesProxyMatch({ config, cookies: display, url })).toBe(false);
    },
  );

  it.each(['/u/juno/stats/2025', '/u/card', '/u/juno/stats/2025/cards'])(
    'still refreshes on the page %s',
    (url) => {
      expect(doesProxyMatch({ config, cookies: withSession, url })).toBe(true);
    },
  );
});
