import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { signInAs } from './helpers/session';
import { untilStable } from './helpers/viewport';

/**
 * The episode modal (`?season=N&episode=M`, EP-B) on The Bear's stub
 * (136315): opens from the URL, steps with ‹ › and ←/→ across seasons,
 * closes with Esc, shows the episode's IMDb rating ("No rating" when missing).
 */
const SHOW = '/136315/the-bear';

const modal = (page: Page) => page.getByRole('dialog');

test.describe('episode modal', () => {
  test('a deep link keeps the show page’s static shell', async ({
    page,
    baseURL,
  }) => {
    await instant(
      page,
      async () => {
        await page.goto(`${SHOW}?season=2&episode=6`);
        await expect(page.getByTestId('route-show')).toBeVisible();
      },
      { baseURL },
    );
  });

  test('opens from the URL with the episode, its rating and credits', async ({
    page,
  }) => {
    await page.goto(`${SHOW}?season=2&episode=6`);
    const dialog = modal(page);
    await expect(
      page.getByRole('dialog', { name: 'S02E06 Fishes' }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('heading', { exact: true, level: 2, name: 'Fishes' }),
    ).toBeVisible();
    await expect(dialog.getByText('Episode 6 of 10')).toBeVisible();
    await expect(dialog.getByText('9.6 IMDb')).toBeVisible();
    await expect(
      dialog.getByRole('link', { name: 'Jamie Lee Curtis as Donna Berzatto' }),
    ).toHaveAttribute('href', '/person/8944');
    await expect(
      dialog
        .getByRole('region', { name: 'Credits' })
        .getByText('Directed by')
        .first(),
    ).toBeAttached();
  });

  test('steps with the arrows and the keyboard, across seasons', async ({
    page,
  }) => {
    await page.goto(`${SHOW}?season=1&episode=8`);
    const dialog = modal(page);
    await expect(dialog.getByText('Episode 8 of 8')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/season=2&episode=1$/);
    await expect(dialog.getByText('Episode 1 of 10')).toBeVisible();

    await dialog.getByRole('button', { name: 'Previous episode' }).click();
    await expect(page).toHaveURL(/season=1&episode=8$/);
  });

  test('is disabled only at the show’s first episode', async ({ page }) => {
    await page.goto(`${SHOW}?season=1&episode=1`);
    const dialog = modal(page);
    await expect(
      dialog.getByRole('button', { name: 'Previous episode' }),
    ).toHaveAttribute('aria-disabled', 'true');
    await expect(
      dialog.getByRole('button', { name: 'Next episode' }),
    ).toHaveAttribute('aria-disabled', 'false');
    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(/season=1&episode=1$/);
  });

  test('says "No rating" when IMDb has none', async ({ page }) => {
    await page.goto(`${SHOW}?season=5&episode=1`);
    await expect(modal(page).getByText('No rating')).toBeVisible();
    await expect(modal(page).getByText('IMDb')).toHaveCount(0);
  });

  test('Esc closes it and keeps the season', async ({ page }) => {
    await page.goto(`${SHOW}?season=2&episode=6`);
    await expect(modal(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal(page)).toBeHidden();
    await expect(page).toHaveURL(/\?season=2$/);
  });

  test.describe('history', () => {
    /** Opens S01E02 from its tile, scrolled into the middle of the page. */
    async function openFromTile(page: Page) {
      await page.goto('/');
      await page.goto(SHOW);
      // the streamed viewer wall replaces the shell's: act on that one, once
      // no placeholder is left (an element found earlier is detached by it)
      await expect(page.locator('[data-placeholder]')).toHaveCount(0);
      await expect(page.locator('[data-slot="episodes"]')).toBeAttached();
      const tile = page.getByRole('button', { name: /^Open S01E02 / });
      await tile.scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, 120);
      await untilStable(() => page.evaluate(() => window.scrollY), {
        message: 'the wheel scroll has landed',
      });
      const scrollY = await page.evaluate(() => window.scrollY);
      const length = await page.evaluate(() => window.history.length);
      await tile.click();
      await expect(modal(page)).toBeVisible();
      await expect(page).toHaveURL(/\?season=1&episode=2$/);
      return { length, scrollY, tile };
    }

    test('opening from a tile pushes one entry; stepping replaces it', async ({
      page,
    }) => {
      const { length } = await openFromTile(page);
      expect(await page.evaluate(() => window.history.length)).toBe(length + 1);
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await expect(page).toHaveURL(/\?season=1&episode=4$/);
      expect(await page.evaluate(() => window.history.length)).toBe(length + 1);
    });

    test('Back closes it, keeps the scroll and focuses the tile; Forward reopens it', async ({
      page,
    }) => {
      const documents: string[] = [];
      page.on('request', (request) => {
        if (request.isNavigationRequest() || request.headers().rsc) {
          documents.push(request.url());
        }
      });
      const { scrollY, tile } = await openFromTile(page);
      documents.length = 0;
      await page.goBack();
      await expect(modal(page)).toBeHidden();
      await expect(page).toHaveURL(new RegExp(`${SHOW}$`));
      await expect(tile).toBeFocused();
      expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);

      await page.goForward();
      await expect(
        page.getByRole('dialog', { name: /^S01E02 / }),
      ).toBeVisible();
      await expect(page).toHaveURL(/\?season=1&episode=2$/);
      // the History API only: no document or RSC request either way
      expect(documents).toEqual([]);
    });

    test('× after opening from a tile goes back: no dead entry', async ({
      page,
    }) => {
      const { length, scrollY } = await openFromTile(page);
      await modal(page).getByRole('button', { name: 'Close' }).click();
      await expect(modal(page)).toBeHidden();
      await expect(page).toHaveURL(new RegExp(`${SHOW}$`));
      expect(await page.evaluate(() => window.history.length)).toBe(length + 1);
      expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
      // Back now leaves the show page (the entry before it)
      await page.goBack();
      await expect(page).toHaveURL(/\/$/);
    });

    test('a direct ?episode= link: Esc replaces the URL, Back leaves the page', async ({
      page,
    }) => {
      await page.goto('/');
      await page.goto(`${SHOW}?season=2&episode=6`);
      await expect(modal(page)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(modal(page)).toBeHidden();
      await expect(page).toHaveURL(/\?season=2$/);
      await page.goBack();
      await expect(page).toHaveURL(/\/$/);
    });
  });
});

test('an episode the show does not have opens no modal and leaves the URL', async ({
  page,
}) => {
  await page.goto('/136315/the-bear?season=1&episode=99');
  await page.waitForURL(
    (url) =>
      url.searchParams.get('season') === '1' &&
      !url.searchParams.has('episode'),
  );
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Episode 99')).toHaveCount(0);
});

// At tablet width the side-by-side face squeezed the title
// into ~190px and its 104px lines rose above the panel's top, where no
// scroll reaches. Below `lg` the modal stacks; at `lg` and up, a short
// window still keeps the title inside the panel.
for (const { height, width } of [
  { height: 813, width: 800 },
  { height: 600, width: 800 },
  { height: 768, width: 1024 },
] as const) {
  test(`the title stays inside the modal at ${width}×${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ height, width });
    await page.goto(`${SHOW}?season=2&episode=6`);
    const dialog = modal(page);
    const heading = dialog.getByRole('heading', {
      exact: true,
      level: 2,
      name: 'Fishes',
    });
    await expect(heading).toBeVisible();
    // measured once the panel has grown in: until then (`data-opening`,
    // ModalShell) it is mid-scale and its scroller deliberately unscrollable
    await expect(dialog.locator('[data-opening]')).toHaveCount(0);
    // the panel is the dialog's scroll container the title sits in
    const scroller = dialog.locator('[data-dialog-scroller]');
    await expect(scroller).toHaveCSS('overflow-y', 'auto');
    const panel = await scroller.boundingBox();
    const title = await heading.boundingBox();
    expect(panel && title).toBeTruthy();
    if (panel && title) {
      expect(title.y).toBeGreaterThanOrEqual(panel.y);
      expect(title.x + title.width).toBeLessThanOrEqual(
        panel.x + panel.width + 1,
      );
    }
    // the last thing in the panel is reachable by scrolling down
    const stub = dialog.getByRole('button', { name: 'Next episode' });
    await stub.scrollIntoViewIfNeeded();
    await expect(stub).toBeInViewport();
  });
}

// The record stub is one element at every width (docked by CSS on a phone):
// crossing 640px with the modal open keeps it, and whatever it holds
test('the record stub survives the window crossing the phone width', async ({
  context,
  page,
}) => {
  await signInAs(context, 'alex');
  await page.setViewportSize({ height: 900, width: 800 });
  await page.goto('/136315/the-bear?season=3&episode=6');
  const stub = page.getByRole('dialog').locator('[data-record-stub]');
  await expect(stub).toBeVisible();
  await stub.evaluate((element) => {
    element.setAttribute('data-kept', 'yes');
  });
  await page.setViewportSize({ height: 844, width: 390 });
  await expect(stub).toHaveCSS('position', 'fixed');
  await expect(stub).toHaveAttribute('data-kept', 'yes');
  await page.setViewportSize({ height: 900, width: 800 });
  await expect(stub).toHaveAttribute('data-kept', 'yes');
});
