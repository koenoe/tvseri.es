import { expect, type Page, test } from '@playwright/test';

import { untilStable } from './helpers/viewport';

/**
 * The episode modal → a face → the person page → Back (The Bear's S01E02,
 * guest Oliver Platt, 17485 in the stub).
 *
 * - The faces link to the person's canonical URL. A bare `/person/17485`
 *   redirected in the stream, and until the redirect landed the page showed
 *   nothing: not the person, not its skeleton.
 * - The show page waits hidden in the router's back/forward cache while the
 *   person page shows. It used to read the person page's URL ("no episode"),
 *   close the modal while hidden, and on Back open it again from the tile,
 *   where it stayed: small, on the tile. Back now brings it back as it was.
 */
const SHOW = '/136315/the-bear';
const PERSON = '/person/17485/oliver-platt';

const modal = (page: Page) => page.getByRole('dialog');
const scroller = (page: Page) => modal(page).locator('[data-dialog-scroller]');

/** The scroller's box, rounded: the panel's place and size on screen. */
async function panelBox(page: Page) {
  const box = await scroller(page).boundingBox();
  return box
    ? {
        height: Math.round(box.height),
        width: Math.round(box.width),
        x: Math.round(box.x),
        y: Math.round(box.y),
      }
    : null;
}

/**
 * Records, every frame, the person-page frames that show neither the page
 * nor its skeleton.
 */
function watchForEmptyFrames(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as { emptyFrames: string[] };
    w.emptyFrames = [];
    const shown = (selector: string) => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      return Boolean(box && box.width > 0 && box.height > 0);
    };
    const start = performance.now();
    const tick = () => {
      if (
        location.pathname.startsWith('/person/') &&
        !shown('[data-testid="route-person"]') &&
        !shown('[data-placeholder="person"]')
      ) {
        w.emptyFrames.push(
          `${Math.round(performance.now() - start)}ms ${location.pathname}`,
        );
      }
      if (!shown('[data-testid="route-person"]')) {
        requestAnimationFrame(tick);
      }
    };
    tick();
  });
}

const emptyFrames = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { emptyFrames: string[] }).emptyFrames,
  );

async function openFromTile(page: Page) {
  await page.goto('/');
  await page.goto(SHOW);
  await expect(page.locator('[data-placeholder]')).toHaveCount(0);
  const tile = page.getByRole('button', { name: /^Open S01E02 / });
  await tile.scrollIntoViewIfNeeded();
  await untilStable(() => page.evaluate(() => window.scrollY), {
    message: 'the scroll has landed',
  });
  await tile.click();
  await expect(modal(page)).toBeVisible();
  // measured once the panel has grown in (`data-opening`, ModalShell)
  await expect(modal(page).locator('[data-opening]')).toHaveCount(0);
  await untilStable(() => panelBox(page), {
    message: 'the panel has grown in',
  });
  return { opened: await panelBox(page), tile };
}

type Slow = Readonly<{ cpu: number; ms: number }>;

/** CPU throttling, and the person page's data and the chunks it loads late. */
async function slowDown(page: Page, { cpu, ms }: Slow) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.route(
    (url) =>
      url.pathname.startsWith('/person/') ||
      url.pathname.startsWith('/_next/static/chunks/'),
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      await route.continue();
    },
  );
}

async function faceThereAndBack(page: Page, slow?: Slow) {
  const { opened, tile } = await openFromTile(page);
  if (slow) {
    await slowDown(page, slow);
  }
  const face = modal(page).getByRole('link', {
    name: "Oliver Platt as Uncle Jimmy 'Cicero' Kalinowski",
  });
  await expect(face).toHaveAttribute('href', PERSON);

  await watchForEmptyFrames(page);
  await face.click();
  await expect(page).toHaveURL(PERSON);
  await expect(page.getByTestId('route-person')).toBeVisible({
    timeout: 15_000,
  });
  expect(await emptyFrames(page), 'frames with an empty person page').toEqual(
    [],
  );

  await page.goBack();
  await expect(page).toHaveURL(/\?season=1&episode=2$/);
  await expect(modal(page)).toBeVisible();
  // full size and in place: the box it had when it first opened
  await expect
    .poll(() => panelBox(page), { message: 'the modal is back as it was' })
    .toEqual(opened);
  await expect(modal(page).locator('[data-opening]')).toHaveCount(0);
  expect(await modal(page).evaluate((node) => node.matches(':modal'))).toBe(
    true,
  );
  expect(
    await page.evaluate(() => document.documentElement.style.overflow),
  ).toBe('hidden');

  // and it still closes like any other time: back to the entry before it
  await page.keyboard.press('Escape');
  await expect(modal(page)).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`${SHOW}$`));
  await expect(tile).toBeFocused();
  expect(
    await page.evaluate(() => document.documentElement.style.overflow),
  ).toBe('');
}

test.describe('episode modal → person → Back', () => {
  test.use({ viewport: { height: 720, width: 1280 } });

  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    test(`a face opens the person page, Back brings the modal back (${reducedMotion})`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion });
      await faceThereAndBack(page);
    });

    test(`the same on a slow CPU and network @perf (${reducedMotion})`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion });
      await faceThereAndBack(page, { cpu: 6, ms: 1500 });
    });
  }
});
