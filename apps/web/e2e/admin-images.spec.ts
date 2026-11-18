import { expect, type Page, test } from '@playwright/test';

import { signInAs } from './helpers/session';

/**
 * The admin image tray on a production build with the stub API:
 * only the admin gets it, a save answers at once and persists for everyone, a
 * failed save keeps the pick and says so.
 */

const SHOW = '/136315/the-bear';
const stubApi = `http://localhost:${Number(process.env.STUB_API_PORT ?? Number(process.env.E2E_PORT ?? 3100) + 1000)}`;

const tray = (page: Page) =>
  page.getByRole('dialog', { name: 'Hero images for The Bear' });

/** The tray's requests: its reads (`/api/admin/*`) and its writes (server actions). */
const isTrayRequest = (
  method: string,
  url: string,
  headers: Record<string, string>,
) =>
  new URL(url).pathname.startsWith('/api/admin/') ||
  (method === 'POST' && 'next-action' in headers);

/** Counts the tray's requests the page sends from now on. */
const countTrayRequests = (page: Page) => {
  const counter = { requests: 0 };
  page.on('request', (request) => {
    if (isTrayRequest(request.method(), request.url(), request.headers())) {
      counter.requests += 1;
    }
  });
  return counter;
};

/**
 * The page has loaded, hydrated and gone idle: the moment the admin island
 * preloads the choices and the tray (`whenIdle`), so any request it would
 * send has been sent, and has finished, by then.
 */
async function settled(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestIdleCallback(() => resolve(), { timeout: 4000 });
      }),
  );
  await page.waitForLoadState('networkidle');
}

// The picks are shared state (a save is "for everyone"), so these tests run
// in order, alone (the `admin` project runs after every other spec), and start
// from the seeds.
test.describe.configure({ mode: 'serial' });

test.beforeEach(async () => {
  await fetch(`${stubApi}/__stub/reset`, {
    headers: { 'x-api-key': 'stub' },
    method: 'POST',
  });
});

test('a regular viewer never gets the tray or its requests', async ({
  context,
  page,
}) => {
  await signInAs(context, 'alex');
  const sent = countTrayRequests(page);
  await page.goto(`${SHOW}?images`);
  await settled(page);
  await expect(tray(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Hero images/ })).toHaveCount(
    0,
  );
  expect(sent.requests).toBe(0);
});

test('an admin’s page view reads no image choices until the Admin row opens (the check above can fail)', async ({
  context,
  page,
}) => {
  await signInAs(context, 'sam');
  const sent = countTrayRequests(page);
  await page.goto(SHOW);
  await settled(page);
  expect(sent.requests).toBe(0);
  await page
    .getByRole('button', { name: /^More actions for The Bear/ })
    .first()
    .click();
  await expect(
    page.getByRole('menuitem', { name: /Hero images/ }),
  ).toBeVisible();
  await expect.poll(() => sent.requests).toBeGreaterThan(0);
});

test('an admin opens the tray from the Remote’s Admin row, the only way in on the page', async ({
  context,
  page,
}) => {
  await signInAs(context, 'sam');
  await page.goto(SHOW);
  await settled(page);
  await page.locator('main').hover();
  // no hover chip beside the hero's buttons
  await expect(page.getByRole('button', { name: /Hero images/ })).toHaveCount(
    0,
  );
  await page
    .getByRole('button', { name: /^More actions for The Bear/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: /Hero images/ }).click();
  await expect(tray(page)).toBeVisible();
});

test('an admin picks a backdrop and saves it for everyone', async ({
  context,
  page,
}) => {
  await signInAs(context, 'sam');
  await page.goto(`${SHOW}?images`);
  await expect(tray(page)).toBeVisible();
  const second = page.getByRole('radio', { name: /^Backdrop 2 of 24/ });
  await second.click();
  await expect(second).toHaveAttribute('aria-checked', 'true');
  await expect(tray(page).getByText('Unsaved')).toBeVisible();
  await page.getByRole('button', { name: 'Save for everyone' }).click();
  // The save answers once stored (the stub has no CDN purge to wait for, so
  // how fast is the machine's, not a rule: no budget of its own)
  await expect(
    page.getByText('Saved for everyone. Visitors get it on their next visit.'),
  ).toBeVisible();
  await expect(tray(page)).toHaveCount(0);

  await page.goto(`${SHOW}?images`);
  await expect(
    page.getByRole('radio', { name: /^Backdrop 2 of 24, saved/ }),
  ).toHaveAttribute('aria-checked', 'true');
  await expect(tray(page).getByText('Your pick · saved')).toBeVisible();
});

test('a failed save keeps the pick and offers Try again', async ({
  context,
  page,
}) => {
  await signInAs(context, 'sam');
  await page.goto(`${SHOW}?images`);
  const third = page.getByRole('radio', { name: /^Backdrop 3 of 24/ });
  await third.click();
  await page.route(`**${SHOW}**`, (route) =>
    route.request().method() === 'POST' &&
    'next-action' in route.request().headers()
      ? route.fulfill({ body: '', status: 500 })
      : route.continue(),
  );
  await page.getByRole('button', { name: 'Save for everyone' }).click();
  await expect(
    page.getByText('Couldn’t save. Visitors still see the old images.'),
  ).toBeVisible();
  await expect(tray(page)).toBeVisible();
  await expect(third).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
