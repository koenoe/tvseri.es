import { type BrowserContext, expect, type Page, test } from '@playwright/test';

import { dialog, field, open, option } from './helpers/search';
import { signInAs } from './helpers/session';
import { phoneScrollbars } from './helpers/viewport';

/**
 * Search finds a member by their exact `@handle` (signed in only; a bare
 * word never asks), and the empty circle's Find people opens search
 * with `@` typed. A member result is the recents' chip under “Members”.
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

/** The answer to a query the search overlay sent to `/api/search` */
const searched = (page: Page, query: string) =>
  page.waitForResponse((response) =>
    response.url().includes(`/api/search?q=${query}`),
  );

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
  // a bare word asks the search only: once it has answered, a member lookup
  // that was going to go out has gone out
  const answered = searched(page, 'juno');
  await field(page).fill('juno');
  await answered;
  await expect(
    dialog(page)
      .getByText(/Nothing for juno|Series|People/)
      .first(),
  ).toBeVisible();
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
  const answered = searched(page, 'juno');
  await field(page).fill('juno');
  await answered;
  await expect(members(page)).toHaveCount(0);
  expect(requests).toEqual([]);
});

const findPeople = async (
  page: Page,
  context: BrowserContext,
  width: number,
) => {
  await page.setViewportSize({ height: 900, width });
  await phoneScrollbars(page, width);
  await signInAs(context, 'nina');
  await open(page, '/u/nina');
  const find = page.getByRole('button', { name: 'Find people' });
  await find.scrollIntoViewIfNeeded();
  await expect(find).toBeVisible();
  return find;
};

for (const width of [1440, 390]) {
  test(`Find people on the empty circle opens search ready for a handle (${width})`, async ({
    context,
    page,
  }) => {
    const find = await findPeople(page, context, width);
    await find.click();
    await expect(field(page)).toBeFocused();
    await expect(field(page)).toHaveValue('@');
    // a lone @ asks nothing: the recents stay
    await expect(dialog(page).getByText(/^Nothing for/)).toHaveCount(0);
    await page.keyboard.type('juno');
    await expect(option(page, '@juno')).toBeVisible();
  });

  test(`@design Find people is a 32px button (${width})`, async ({
    context,
    page,
  }) => {
    const find = await findPeople(page, context, width);
    const box = await find.boundingBox();
    expect(Math.round(box?.height ?? 0)).toBe(32);
  });
}
