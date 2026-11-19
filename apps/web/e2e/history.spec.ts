import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { recordNavigationFetches } from './helpers/navigationFetches';
import { signInAs } from './helpers/session';
import { untilStable } from './helpers/viewport';

/**
 * The watch-history sheet, the date picker and "I'm up to…" on a production
 * build (stub viewer `alex`: The Bear S1–S2 watched, S03E01–E4, E5 Next up).
 * The overlays are client-only: `?history` must keep the page shell instant.
 */
const SHOW = '/136315/the-bear';

test.beforeEach(async ({ context }) => {
  await signInAs(context, 'alex');
});

const sheet = (page: Page) =>
  page.getByRole('dialog', { name: 'Watch history' });
const season = (page: Page, n: number) =>
  sheet(page).getByRole('region', { name: `Season ${n}` });
const chip = (page: Page, n: number, e: number) =>
  season(page, n).locator(`[data-chip="${e - 1}"]`);

test('?history keeps the page shell instant, then opens the sheet', async ({
  baseURL,
  page,
}) => {
  await instant(
    page,
    async () => {
      await page.goto(`${SHOW}?history`);
      await expect(page.getByTestId('route-show')).toBeVisible();
    },
    { baseURL },
  );
  await expect(sheet(page)).toBeVisible();
  // The show row's counts: the progress line's words (alex skipped S02E05)
  await expect(
    sheet(page).getByText('21 watched · 1 skipped').first(),
  ).toBeVisible();
});

/**
 * The sheet's panel position per frame while it opens (on screen, not just
 * its style: Chrome once scrolled the dialog to follow the slide, so the
 * transform changed and nothing moved).
 */
async function samplePanel(page: Page, axis: 'left' | 'top') {
  await page.evaluate((side) => {
    const w = window as unknown as {
      __animated: boolean;
      __panel: number[];
      __run: boolean;
    };
    w.__panel = [];
    w.__animated = false;
    w.__run = true;
    const tick = () => {
      const panel = document.querySelector(
        'dialog[open] > div:not([data-dialog-backdrop])',
      );
      if (panel) {
        w.__panel.push(Math.round(panel.getBoundingClientRect()[side]));
        w.__animated ||= panel
          .getAnimations()
          .some((animation) => animation.playState === 'running');
      }
      if (w.__run) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }, axis);
}

const stopSampling = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __panel: number[]; __run: boolean };
    w.__run = false;
    return w.__panel;
  });

// The first open after a hard load once jumped into place: the slide is
// checked where it is longest, the phone's full height.
test('the sheet slides in on its first open after a hard load', async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto(SHOW);
  const trigger = page
    .getByRole('button', { name: /open watch history/ })
    .first();
  await expect(trigger).toBeVisible();
  await samplePanel(page, 'top');
  await trigger.click();
  await expect(sheet(page)).toBeVisible();
  // the slide has come to rest
  await untilStable(
    () =>
      page.evaluate(() => {
        const w = window as unknown as { __panel: number[] };
        return w.__panel.at(-1);
      }),
    { message: 'the sheet stops sliding', quietMs: 300 },
  );
  const positions = await stopSampling(page);
  const final = positions.at(-1) ?? 0;
  // it starts away from its place (a sheet that jumps is at rest on its
  // first frame) and slides: a step on the way is seen, or, where the
  // main thread stalled for the whole slide (a slow machine paints none
  // of its frames), the slide is seen running on the panel
  expect(positions[0]).not.toBe(final);
  const between = new Set(
    positions.filter((value) => value !== final && value !== positions[0]),
  );
  const animated = await page.evaluate(
    () => (window as unknown as { __animated: boolean }).__animated,
  );
  expect(between.size > 0 || animated).toBe(true);
});

test.describe('Back closes the sheet, like the episode modal', () => {
  async function openFromProgress(page: Page) {
    await page.goto('/');
    await page.goto(SHOW);
    await expect(page.locator('[data-placeholder]')).toHaveCount(0);
    const trigger = page
      .getByRole('button', { name: /open watch history/ })
      .filter({ visible: true })
      .first();
    await trigger.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 120);
    await untilStable(() => page.evaluate(() => window.scrollY), {
      message: 'the wheel scroll has landed',
    });
    const scrollY = await page.evaluate(() => window.scrollY);
    const length = await page.evaluate(() => window.history.length);
    await trigger.click();
    await expect(sheet(page)).toBeVisible();
    await expect(page).toHaveURL(/\?history$/);
    return { length, scrollY, trigger };
  }

  test('Back closes it, keeps the scroll and focus; Forward reopens it', async ({
    page,
  }) => {
    const documents = recordNavigationFetches(page);
    const { length, scrollY, trigger } = await openFromProgress(page);
    expect(await page.evaluate(() => window.history.length)).toBe(length + 1);
    documents.length = 0;
    await page.goBack();
    await expect(sheet(page)).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${SHOW}$`));
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);

    await page.goForward();
    await expect(sheet(page)).toBeVisible();
    await expect(page).toHaveURL(/\?history$/);
    // the History API only: no document load or RSC navigation either way
    expect(documents).toEqual([]);
  });

  test('✕ after opening it goes back: no dead entry', async ({ page }) => {
    const { length, scrollY } = await openFromProgress(page);
    await sheet(page).getByRole('button', { name: 'Close' }).click();
    await expect(sheet(page)).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${SHOW}$`));
    expect(await page.evaluate(() => window.history.length)).toBe(length + 1);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  });

  test('a direct ?history link: Esc replaces the URL, Back leaves the page', async ({
    page,
  }) => {
    await page.goto('/');
    await page.goto(`${SHOW}?history&season=2`);
    await expect(sheet(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet(page)).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${SHOW}$`));
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  });
});

test('a tap marks a chip, Escape closes and drops ?history', async ({
  page,
}) => {
  await page.goto(`${SHOW}?history&season=3`);
  await sheet(page).getByRole('button', { name: 'Tap marks' }).click();
  const e5 = chip(page, 3, 5);
  await expect(e5).toHaveAttribute('aria-pressed', 'false');
  await e5.click();
  await expect(e5).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByText('Marked S03E05 Children · Just now'),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();
  await expect(page).not.toHaveURL(/history/);
});

test('the legend is hidden until its button is pressed', async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto(`${SHOW}?history&season=3`);
  await expect(sheet(page)).toBeVisible();
  await expect(sheet(page).getByText('Not watched')).toHaveCount(0);
  await expect(sheet(page)).not.toContainText(': null');
  await sheet(page).getByRole('button', { name: 'Legend' }).click();
  await expect(sheet(page).getByText('Not watched')).toBeVisible();
});

test('the sheet reopens in the mode last picked', async ({ page }) => {
  await page.goto(`${SHOW}?history&season=3`);
  await sheet(page).getByRole('button', { name: 'Tap marks' }).click();
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();
  await page.goto(`${SHOW}?history&season=3`);
  await expect(
    sheet(page).getByRole('button', { name: 'Tap marks' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    sheet(page).getByRole('button', { name: 'Tap sets a date' }),
  ).toHaveAttribute('aria-pressed', 'false');
});

test('a drag paints a run with a live label and one toast', async ({
  page,
}) => {
  await page.goto(`${SHOW}?history&season=3`);
  await sheet(page).getByRole('button', { name: 'Tap marks' }).click();
  const from = chip(page, 3, 6);
  const to = chip(page, 3, 9);
  await from.scrollIntoViewIfNeeded();
  await from.hover();
  await page.mouse.down();
  const box = await to.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2, {
    steps: 8,
  });
  await expect(season(page, 3).getByText('Mark E06–E09')).toBeVisible();
  await page.mouse.up();
  await expect(page.getByText('Marked S03E06–S03E09 · Just now')).toBeVisible();
  for (const e of [6, 7, 8, 9]) {
    await expect(chip(page, 3, e)).toHaveAttribute('aria-pressed', 'true');
  }
});

test('the sheet opens in Tap sets a date: a tap opens the picker and marks nothing', async ({
  page,
}) => {
  await page.goto(`${SHOW}?history&season=3`);
  await expect(
    sheet(page).getByRole('button', { name: 'Tap sets a date' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    sheet(page).getByRole('button', { name: 'Tap marks' }),
  ).toHaveAttribute('aria-pressed', 'false');
  await chip(page, 3, 5).click();
  const picker = page.getByRole('dialog', { name: 'When did you watch E05?' });
  await expect(picker).toBeVisible();
  await expect(chip(page, 3, 5)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText(/Marked/)).toHaveCount(0);
});

test('Tap sets a date opens the picker; a choice applies', async ({ page }) => {
  await page.goto(`${SHOW}?history&season=3`);
  // switch away and back: the explicit switch still works
  await sheet(page).getByRole('button', { name: 'Tap marks' }).click();
  await sheet(page).getByRole('button', { name: 'Tap sets a date' }).click();
  await chip(page, 3, 5).click();
  const picker = page.getByRole('dialog', { name: 'When did you watch E05?' });
  await expect(picker).toBeVisible();
  await expect(
    picker.getByText('S03E05 · Children · Not watched yet'),
  ).toBeVisible();
  await picker.getByRole('button', { name: /^Yesterday/ }).click();
  await expect(picker).toBeHidden();
  await expect(chip(page, 3, 5)).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByText(/Marked S03E05 Children · Yesterday/),
  ).toBeVisible();
});

test('the whole series’ calendar dates every aired episode with the picked day', async ({
  page,
}) => {
  // A viewer with nothing tracked: every aired episode is open
  await signInAs(page.context(), 'nina');
  await page.goto(`${SHOW}?history`);
  await sheet(page)
    .getByRole('button', { name: 'When did you watch The Bear?' })
    .click();
  const picker = page.getByRole('dialog', {
    name: 'When did you watch The Bear?',
  });
  await expect(picker).toBeVisible();
  await expect(
    picker.getByText(/^One date for all \d+ episodes$/),
  ).toBeVisible();
  // The 15th of last month: always in the past, never today
  await picker.getByRole('button', { name: /previous month/i }).click();
  await picker
    .locator('[role="gridcell"]:not([data-outside]) button', {
      hasText: /^15$/,
    })
    .click();
  await expect(picker).toBeHidden();
  await expect(page.getByText(/^Marked the whole series/)).toBeVisible();

  const regular = sheet(page).getByRole('button', { name: /^S0[1-9]E\d\d/ });
  await expect(regular.first()).toHaveAttribute('aria-pressed', 'true');
  const names = await regular.evaluateAll((chips) =>
    chips.map(
      (chip) =>
        chip.getAttribute('aria-label') ?? chip.getAttribute('title') ?? '',
    ),
  );
  const aired = names.filter((name) => !/ · (Airs |Not aired yet)/.test(name));
  expect(aired.length).toBeGreaterThan(0);
  for (const name of aired) {
    expect(name).toMatch(/ · \D*\b15\b[^·]*, 21:00$/);
  }
});

test('Up to here opens I’m up to… and marks up to the target', async ({
  page,
}) => {
  await page.goto(`${SHOW}?history&season=3`);
  await sheet(page).getByRole('button', { name: 'Up to here' }).click();
  await chip(page, 3, 7).click();
  const upTo = page.getByRole('dialog', {
    name: 'Which episode did you watch last?',
  });
  await expect(upTo).toBeVisible();
  // The viewer's skipped S02E05 stays skipped
  await expect(
    upTo.getByText('Up to S03E07 Legacy · marks 3 (S03E05–S03E07)'),
  ).toBeVisible();
  await upTo
    .getByRole('button', { name: 'Mark 3 episodes · just now' })
    .click();
  await expect(upTo).toBeHidden();
  await expect(chip(page, 3, 7)).toHaveAttribute('aria-pressed', 'true');
});

test('I’m up to… previews what it would change before anything is written', async ({
  context,
  page,
}) => {
  // a new account: the first-tracking prompt's "I'm up to…" opens the dialog
  await signInAs(context, 'nina');
  await page.goto(SHOW);
  await page.getByRole('button', { name: 'I’m up to…' }).click();
  const upTo = page.getByRole('dialog', {
    name: 'Which episode did you watch last?',
  });
  await expect(upTo).toBeVisible();
  // nothing picked: no plan, nothing to confirm
  await expect(upTo.getByText('Pick the last episode you saw.')).toBeVisible();
  await expect(
    upTo.getByRole('button', { name: 'Pick an episode' }),
  ).toBeDisabled();
  // picking an episode is the preview: the plan and
  // the button say what will change; closing without confirming writes nothing
  await upTo.getByRole('button', { name: /^Up to S01E03 / }).click();
  await expect(
    upTo.getByText(/^Up to S01E03 .* · marks 3 \(S01E01–S01E03\)/),
  ).toBeVisible();
  await expect(
    // a first answer is dated "I don’t remember"
    upTo.getByRole('button', { name: /^Mark 3 episodes · / }),
  ).toBeEnabled();
  await upTo.getByRole('button', { name: 'Close' }).click();
  await expect(upTo).toBeHidden();
  await expect(page.getByText(/Marked/)).toHaveCount(0);
});

test('on desktop the sheet behaves as every side panel (the menu): the scrim, an inert locked page, Back closes', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto(`${SHOW}?history`);
  await expect(sheet(page)).toBeVisible();
  // the dialogs' scrim (BACKDROP.side), the same as the menu's dim
  await expect(page.locator('dialog[open] > [data-dialog-backdrop]')).toHaveCSS(
    'background-color',
    /^(rgba\(0, 0, 0, 0\.5\)|oklab\(0 0 0 \/ 0\.5\))$/,
  );
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
  await page.goBack();
  await expect(sheet(page)).toBeHidden();
  await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden');
});
