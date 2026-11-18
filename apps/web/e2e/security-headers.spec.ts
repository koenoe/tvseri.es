import { expect, type Page, test } from '@playwright/test';

/**
 * The static security headers (lib/security/headers.ts) on a page and on the
 * static 404, and pages that render with none of them blocking anything:
 * no CSP violation and no console error.
 */

const EXPECTED = [
  'content-security-policy',
  'cross-origin-opener-policy',
  'permissions-policy',
  'referrer-policy',
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options',
];

test('a page and the static 404 send the security headers', async ({
  request,
}) => {
  for (const path of ['/', '/shows/breaking-bad']) {
    const headers = (await request.get(path)).headers();
    for (const name of EXPECTED) {
      expect(headers[name], `${path}: ${name}`).toBeTruthy();
    }
    expect(headers['content-security-policy']).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers['x-content-type-options']).toBe('nosniff');
  }
});

/** Collects CSP violations and console errors from the first script on. */
async function watch(page: Page) {
  const problems: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(
        `CSP violation: ${event.violatedDirective} ${event.blockedURI}`,
      );
    });
  });
  page.on('console', (message) => {
    // an HTTP status (the 404 document, a route not built yet) is not a
    // blocked load; CSP blocks log “Refused to …”
    const httpStatus = message
      .text()
      .startsWith('Failed to load resource: the server responded');
    if (message.type() === 'error' && !httpStatus) {
      problems.push(message.text());
    }
  });
  page.on('pageerror', (error) => problems.push(error.message));
  return problems;
}

test('the home page renders with no CSP violation', async ({ page }) => {
  const problems = await watch(page);
  await page.goto('/');
  // hydrated and the lazy search chunk loaded: every script has run
  await expect(page.locator('html')).toHaveAttribute('data-search-ready', '');
  expect(problems).toEqual([]);
});

test('the 404 loads its TMDB posters and the search route with no CSP violation', async ({
  page,
}) => {
  const problems = await watch(page);
  await page.goto('/shows/breaking-bad');
  await expect(page.locator('html')).toHaveAttribute('data-search-ready', '');

  const poster = page
    .getByRole('region', { name: 'Or start something new' })
    .locator('img')
    .first();
  await expect(poster).toHaveAttribute('src', /^https:\/\/image\.tmdb\.org\//);

  // the search overlay calls a same-origin route handler
  await page.evaluate(async () => {
    await fetch('/api/search?q=breaking%20bad').catch(() => undefined);
  });
  expect(problems).toEqual([]);
});
