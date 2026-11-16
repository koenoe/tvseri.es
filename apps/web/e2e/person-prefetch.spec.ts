import { expect, type Page, test } from '@playwright/test';

/**
 * Person links prefetch on intent only (`PERSON_PREFETCH`): a person page is
 * the costliest to generate, so the cast in view asks for nothing until a
 * hover, keyboard focus or touch.
 */

test.use({ viewport: { height: 900, width: 1440 } });

/** The person-page prefetches the page has asked for so far */
function personPrefetches(page: Page) {
  const paths: string[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (
      pathname.startsWith('/person/') &&
      request.headers()['next-router-prefetch'] === '1'
    ) {
      paths.push(pathname);
    }
  });
  return paths;
}

test('the cast in view prefetches no person page until one is hovered', async ({
  page,
}) => {
  const prefetched = personPrefetches(page);
  await page.goto('/136315/the-bear');
  const person = page.locator('a[href^="/person/"]').first();
  await person.scrollIntoViewIfNeeded();
  await expect(person).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(prefetched).toEqual([]);

  const href = await person.getAttribute('href');
  const hovered = page.waitForRequest(
    (request) =>
      request.headers()['next-router-prefetch'] === '1' &&
      new URL(request.url()).pathname === href,
  );
  await person.hover();
  await hovered;
});
