import { readFileSync } from 'node:fs';
import path from 'node:path';

import { type APIRequestContext, expect, test } from '@playwright/test';
import { CACHE_LIFE } from '@tvseri.es/constants';

/**
 * Data at build time: a page prerendered while the
 * API was down holds its placeholders on the `unavailable` profile
 * (revalidated after 30 s), so the build reports a finite revalidate for it and the page
 * regenerates in the background, without a rebuild, once the API answers.
 * The server (`server.ts`) built with no API and then started the stub.
 */
const NEXT_DIR = path.resolve(import.meta.dirname, '../../.next');
const WINDOW_MS = CACHE_LIFE.unavailable.sMaxAge * 1000;

/** Each page and a text only its API data draws */
const PAGES = [
  // the hero's "N shows on TMDB" (`getLandingCount`)
  { marker: 'series on TMDB', url: '/genre/crime' },
  // Duration, the default lens: the "Under 6 hours" tile's count from
  // `getDurationTiles` (the stub's 1104; tile names are static)
  { marker: '1,104 miniseries', url: '/discover' },
] as const;

type PrerenderManifest = Readonly<{
  routes: Readonly<
    Record<string, { initialRevalidateSeconds: number | false } | undefined>
  >;
}>;

const readJson = <T>(file: string): T =>
  JSON.parse(readFileSync(path.join(NEXT_DIR, file), 'utf8')) as T;

const seconds = (ms: number) => Math.round(ms / 1000);

async function fetchPage(request: APIRequestContext, url: string) {
  const response = await request.get(url);
  return {
    cacheControl: response.headers()['cache-control'] ?? '',
    html: await response.text(),
    nextCache: response.headers()['x-nextjs-cache'] ?? '',
  };
}

test('the build reports a finite revalidate for pages prerendered without the API', () => {
  const { routes } = readJson<PrerenderManifest>('prerender-manifest.json');
  for (const { url } of PAGES) {
    expect(routes[url]?.initialRevalidateSeconds, url).toBe(WINDOW_MS / 1000);
  }
});

test('a placeholder fills within the unavailable window, without a rebuild', async ({
  request,
}) => {
  const { apiUpAt, builtAt } = readJson<{ apiUpAt: number; builtAt: number }>(
    'regenerate-timing.json',
  );

  for (const { marker, url } of PAGES) {
    const first = await fetchPage(request, url);
    expect(first.html, `${url} was prerendered with its data`).not.toContain(
      marker,
    );
  }

  const filledAt = await Promise.all(
    PAGES.map(async ({ marker, url }) => {
      await expect
        .poll(
          async () => {
            const { cacheControl, html, nextCache } = await fetchPage(
              request,
              url,
            );
            const filled = html.includes(marker);
            console.log(
              `[regenerate] ${url} +${seconds(Date.now() - builtAt)} s after the build: ${filled ? 'filled' : 'placeholder'} (x-nextjs-cache ${nextCache || '-'}, ${cacheControl})`,
            );
            return filled;
          },
          // the window plus one regeneration and a little slack
          { intervals: [10_000], timeout: WINDOW_MS + 90_000 },
        )
        .toBe(true);
      return Date.now();
    }),
  );

  for (const [index, { url }] of PAGES.entries()) {
    const at = filledAt[index] ?? Date.now();
    console.log(
      `[regenerate] ${url} filled ${seconds(at - builtAt)} s after the build, ${seconds(at - apiUpAt)} s after the API came up`,
    );
    expect(at - builtAt, url).toBeLessThan(WINDOW_MS + 90_000);
  }

  // Filled, the page is on its sections' own profiles: no failure life
  const genre = await fetchPage(request, '/genre/crime');
  expect(genre.cacheControl).not.toMatch(
    new RegExp(`s-maxage=${CACHE_LIFE.unavailable.sMaxAge}\\b`),
  );
});
