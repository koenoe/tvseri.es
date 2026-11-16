import { expect, type Page, test } from '@playwright/test';

import { dialog, field, open, option } from './helpers/search';
import { signInAs } from './helpers/session';

/**
 * Search finds a member by their exact `@handle` (signed in only; a bare
 * word never asks), and the empty circle's Find people (V61) opens search
 * with `@` typed. No board
 * draws a member result yet: it is the recents' chip under “Members”.
 */

const memberRequests = (page: Page) => {
  const urls: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/me/member')) {
      urls.push(request.url());
    }
  });
  return urls;
};

const members = (page: Page) =>
  dialog(page).getByRole('group', { name: 'Members' });

async function openSearch(page: Page) {
  await page.keyboard.press('Control+k');
  await expect(field(page)).toBeFocused();
}

for (const width of [1440, 390]) {
  test.describe(`at ${width}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ height: 900, width });
    });

    test('a handle typed with @ finds the member first; Enter opens their profile', async ({
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      await open(page);
      await page
        .getByRole('banner')
        .getByRole('button', { name: 'Search' })
        .click();
      await field(page).fill('@Juno');
      const juno = option(page, '@juno');
      await expect(juno).toBeVisible();
      await expect(members(page)).toBeVisible();
      await expect(juno).toHaveAttribute('aria-selected', 'true');
      await expect(juno).toHaveAttribute('href', '/u/juno');
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL('/u/juno');
    });
  });
}

test('signed in, a bare word runs the normal search and sends no member request', async ({
  context,
  page,
}) => {
  const requests = memberRequests(page);
  await signInAs(context, 'alex');
  await open(page);
  await openSearch(page);
  await field(page).fill('juno');
  await expect(
    dialog(page)
      .getByText(/Nothing for juno|Series|People/)
      .first(),
  ).toBeVisible();
  await page.waitForTimeout(600);
  await expect(members(page)).toHaveCount(0);
  expect(requests).toEqual([]);
});

test('only an exact handle: a prefix finds nobody', async ({
  context,
  page,
}) => {
  await signInAs(context, 'alex');
  await open(page);
  await openSearch(page);
  await field(page).fill('@jun');
  await expect(dialog(page).getByText('Nothing for @jun')).toBeVisible();
  await expect(members(page)).toHaveCount(0);
});

test('signed out: no member results and no lookup request', async ({
  page,
}) => {
  const requests = memberRequests(page);
  await open(page);
  await openSearch(page);
  await field(page).fill('@juno');
  await expect(
    dialog(page)
      .getByText(/Nothing for @juno|Series|People/)
      .first(),
  ).toBeVisible();
  await field(page).fill('juno');
  await page.waitForTimeout(600);
  await expect(members(page)).toHaveCount(0);
  expect(requests).toEqual([]);
});

for (const width of [1440, 390]) {
  test(`Find people on the empty circle opens search ready for a handle (${width})`, async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ height: 900, width });
    await signInAs(context, 'nina');
    await open(page, '/u/nina');
    const find = page.getByRole('button', { name: 'Find people' });
    await find.scrollIntoViewIfNeeded();
    await expect(find).toBeVisible();
    const box = await find.boundingBox();
    expect(Math.round(box?.height ?? 0)).toBe(32);
    await find.click();
    await expect(field(page)).toBeFocused();
    await expect(field(page)).toHaveValue('@');
    // a lone @ asks nothing: the recents stay
    await expect(dialog(page).getByText(/^Nothing for/)).toHaveCount(0);
    await page.keyboard.type('juno');
    await expect(option(page, '@juno')).toBeVisible();
  });
}
