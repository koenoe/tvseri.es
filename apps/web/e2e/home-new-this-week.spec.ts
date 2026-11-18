import { expect, type Page, test } from '@playwright/test';

import { signInAs } from './helpers/session';
import { clientSize, phoneScrollbars } from './helpers/viewport';

/**
 * Home's "New this week" (stub: `fixtures/home/newThisWeek.ts`): after the
 * feature of the day and before Premieres ("out now", then "coming"),
 * signed out and signed in; the spotlight's shows left out; a wide lead on
 * its backdrop, as tall as the posters after it.
 */

const ROW = '[data-slot="new-this-week"]';

/** The shared sections around the row, in page order */
const sectionOrder = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-slot]')]
      .map((element) => element.getAttribute('data-slot') ?? '')
      .filter((name) =>
        ['feature', 'new-this-week', 'premieres', 'toy'].includes(name),
      ),
  );

const NEIGHBOURS = ['feature', 'new-this-week', 'premieres'];

test('sits between the feature and Premieres, signed out', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(ROW)).toBeVisible();
  const order = await sectionOrder(page);
  expect(order.filter((name) => NEIGHBOURS.includes(name))).toEqual(NEIGHBOURS);
});

test('sits between the feature and Premieres, signed in', async ({
  context,
  page,
}) => {
  await signInAs(context, 'alex');
  await page.goto('/');
  await expect(page.locator(ROW)).toBeVisible();
  const order = await sectionOrder(page);
  expect(order.filter((name) => NEIGHBOURS.includes(name))).toEqual(NEIGHBOURS);
});

test('leaves out the spotlight’s shows and leads with the most popular', async ({
  page,
}) => {
  await page.goto('/');
  const row = page.locator(ROW);
  await expect(
    row.getByRole('heading', { level: 2, name: 'New this week' }),
  ).toBeVisible();
  // Pluribus premiered this week too, but the spotlight shows it
  await expect(row.getByRole('link', { name: /Pluribus/ })).toHaveCount(0);
  const tiles = row.locator('#new-this-week-rail > li');
  await expect(tiles.first()).toContainText('#1 this week');
  await expect(tiles.first()).toContainText('Comedy');
});

test('a tile opens the show', async ({ page }) => {
  await page.goto('/');
  const lead = page
    .locator(ROW)
    .getByRole('link', { name: /Life’s Still Unfair/ });
  await lead.scrollIntoViewIfNeeded();
  await lead.click();
  await expect(page).toHaveURL(/\/940001\//);
});

test('on a phone the lead is as tall as the posters, and the next one peeks', async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await phoneScrollbars(page, 390);
  await page.goto('/');
  const tiles = page.locator(`${ROW} #new-this-week-rail > li`);
  await tiles.first().scrollIntoViewIfNeeded();
  const lead = await tiles.nth(0).locator('a').first().boundingBox();
  const poster = await tiles.nth(1).locator('a').first().boundingBox();
  expect(lead && poster).toBeTruthy();
  expect(Math.abs(lead!.height - poster!.height)).toBeLessThanOrEqual(1);
  const room = (await clientSize(page)).width;
  // about 85% of the room, the next poster in view at the edge
  expect(lead!.width / room).toBeGreaterThan(0.8);
  expect(lead!.width / room).toBeLessThan(0.9);
  expect(poster!.x).toBeLessThanOrEqual(room - 12);
  const scroll = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scroll).toBeLessThanOrEqual(room);
});
