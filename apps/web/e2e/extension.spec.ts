import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { findOverflow, formatProblems } from './helpers/overflow';
import { expectParity, parityTable } from './helpers/parity';
import { signInAs } from './helpers/session';
import { measureParity } from './helpers/shellParity';

// Only the call-to-action streams (user agent, then the extension's ping).
// Headless Chromium has no extension, so the page reads "Not installed".

const HEADLINE = 'Sync your streaming history';

const expectShell = async (page: Page) => {
  await expect(
    page.getByRole('heading', { level: 1, name: HEADLINE }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Install it' }),
  ).toBeVisible();
  // no store listing yet: the manual install is open from the first paint
  await expect(
    page.getByRole('link', { name: 'Download the zip' }),
  ).toBeVisible();
};

const howItWorks = (page: Page) =>
  page.getByRole('dialog', { name: 'How it works' });

test.describe('/extension', () => {
  test('is instant on an initial page load', async ({ page, baseURL }) => {
    await instant(
      page,
      async () => {
        await page.goto('/extension');
        await expectShell(page);
      },
      { baseURL },
    );
    await expect(page).toHaveTitle('Chrome Extension · tvseri.es');
    await expect(page.getByText('Not installed in this browser')).toBeVisible();
  });

  test('the call-to-action’s skeleton holds its place', async ({
    baseURL,
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    const parity = await measureParity(page, {
      baseURL,
      goto: () => page.goto('/extension'),
      ready: () =>
        expect(
          page.getByRole('heading', { level: 1, name: HEADLINE }),
        ).toBeVisible(),
    });
    console.log(parityTable(parity, '/extension'));
    expectParity(parity);
  });

  test('#how-it-works opens the drawing; closing removes the hash in place', async ({
    page,
  }) => {
    await page.goto('/extension#how-it-works');
    await expect(howItWorks(page)).toBeVisible();
    await expect(
      howItWorks(page).getByRole('img', { name: /How a sign-in moves/ }),
    ).toBeVisible();
    const entries = await page.evaluate(() => history.length);

    await howItWorks(page).getByRole('button', { name: 'Close' }).click();
    await expect(howItWorks(page)).toBeHidden();
    expect(new URL(page.url()).hash).toBe('');
    expect(await page.evaluate(() => history.length)).toBe(entries);
    // nothing opened it: focus lands on How it works
    await expect(
      page.getByRole('button', { name: 'How it works' }),
    ).toBeFocused();
  });

  test('How it works opens the dialog and sets the hash', async ({ page }) => {
    await page.goto('/extension');
    await page.getByRole('button', { name: 'How it works' }).click();
    await expect(howItWorks(page)).toBeVisible();
    expect(new URL(page.url()).hash).toBe('#how-it-works');
    await page.keyboard.press('Escape');
    await expect(howItWorks(page)).toBeHidden();
    expect(new URL(page.url()).hash).toBe('');
  });

  test('the manual install downloads the extension’s zip', async ({
    page,
    request,
  }) => {
    await page.goto('/extension');
    const href = await page
      .getByRole('link', { name: 'Download the zip' })
      .getAttribute('href');
    expect(href).toMatch(/^\/tvseries-extension-\d+\.\d+\.\d+\.zip$/);
    const response = await request.get(href ?? '');
    expect(response.status()).toBe(200);
    // a zip starts with PK
    expect((await response.body()).subarray(0, 2).toString()).toBe('PK');
  });
});

test.describe('/extension on a phone', () => {
  // the server reads the user agent: a phone can't run the extension
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });

  test('Copy link takes the skeleton’s place without moving the page', async ({
    baseURL,
    page,
  }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    const parity = await measureParity(page, {
      baseURL,
      goto: () => page.goto('/extension'),
      ready: () =>
        expect(
          page.getByRole('heading', { level: 1, name: HEADLINE }),
        ).toBeVisible(),
    });
    console.log(parityTable(parity, '/extension phone'));
    expectParity(parity);
    await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible();
  });

  // The chrome://extensions chip and Copy are the widest line in a step
  for (const width of [320, 360] as const) {
    test(`holds its text at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ height: 844, width });
      await page.goto('/extension');
      await expect(
        page.getByRole('button', { name: 'Copy link' }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const problems = await findOverflow(page);
      expect(problems, formatProblems(problems)).toEqual([]);
    });
  }
});

test.describe('/extension from Connected apps', () => {
  test.beforeEach(async ({ context }) => {
    // nina has no service connected
    await signInAs(context, 'nina');
  });

  test('a card’s How it works opens the drawing over Settings', async ({
    page,
  }) => {
    await page.goto('/settings/connected-apps');
    await page.getByRole('button', { name: 'Open Netflix' }).click();
    await page
      .getByRole('button', { name: /^How it works\s*\(the extension\)$/ })
      .click();
    await expect(howItWorks(page)).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/settings/connected-apps');
    expect(new URL(page.url()).hash).toBe('#how-it-works');
  });

  test('the extension’s status line is an instant way to /extension', async ({
    page,
  }) => {
    await page.goto('/settings/connected-apps');
    const link = page.getByRole('link', { name: 'Chrome extension' });
    // instant() blocks the network: the link's prefetch must have landed
    const prefetched = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/extension' &&
        'next-router-prefetch' in response.request().headers(),
    );
    await expect(link).toBeVisible();
    await prefetched;
    await instant(page, async () => {
      await link.click();
      await page.waitForURL((url) => url.pathname === '/extension');
      await expectShell(page);
    });
  });
});
