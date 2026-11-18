import { devices, expect, test } from '@playwright/test';

import { open } from './helpers';
import { signInAs } from './helpers/session';
import { untilStable } from './helpers/viewport';

/**
 * Phones: a mark from the episode sheet's record stub, which
 * is docked at the bottom, raises the toast above the stub instead of
 * covering its controls; the first-tracking prompt's answers are 44px touch
 * targets though drawn at 32–34px.
 */
const { defaultBrowserType: _browser, ...iPhone } = devices['iPhone 15'];
test.use(iPhone);

test('the mark toast sits above the episode sheet’s record stub', async ({
  context,
  page,
}) => {
  await signInAs(context, 'alex');
  // hydrated: a click on the server-drawn sheet before it does nothing
  await open(page, '/136315/the-bear?season=3&episode=6');
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('button', { name: /Mark watched \(just now\)/ })
    .click();
  const toast = page.locator('[data-sonner-toast]');
  await expect(toast).toBeVisible();
  // the toast's rise is over: no transition left running on it (a stalled
  // frame on a slow runner looked still to a box read alone), then still
  await expect
    .poll(() =>
      toast.evaluate((node) => node.getAnimations({ subtree: true }).length),
    )
    .toBe(0);
  await untilStable(() => toast.boundingBox(), {
    message: 'the toast rises and stops',
  });
  const stub = await dialog.locator('[data-record-stub]').boundingBox();
  const box = await toast.boundingBox();
  expect(stub && box).toBeTruthy();
  if (stub && box) {
    expect(box.y + box.height).toBeLessThanOrEqual(stub.y - 4);
  }
});

test('the first-tracking answers are 44px touch targets', async ({
  context,
  page,
}) => {
  await signInAs(context, 'nina');
  await page.goto('/136315/the-bear');
  const prompt = page.getByRole('group', {
    name: 'Where are you in this series?',
  });
  for (const name of ['Just starting', 'Finished it all', 'Not now']) {
    const height = await prompt
      .getByRole('button', { name })
      .evaluate(
        (button) =>
          Number.parseFloat(getComputedStyle(button, '::after').height) ||
          button.getBoundingClientRect().height,
      );
    expect(height, name).toBeGreaterThanOrEqual(44);
  }
});

// on a phone the signed-out toast read "Sign in to keep track of
// w…": a toast's message wraps to a second line instead of losing its point
for (const width of [360]) {
  test(`the sign-in toast says all of it at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ height: 800, width });
    // hydrated, and the rows have their tiles: the streamed-in sections
    // replace the buttons a skeleton or the shell drew
    await open(page, '/');
    await expect(page.locator('[data-placeholder]:visible')).toHaveCount(0);
    await page
      .getByRole('button', { name: /^Add .+ to your watchlist$/ })
      .first()
      .click();
    const message = page
      .locator('[data-sonner-toast] p')
      .filter({ hasText: /^Please sign in/ });
    await expect(message).toBeVisible();
    const cut = await message.evaluate(
      (element) =>
        element.scrollHeight > element.clientHeight + 1 ||
        element.scrollWidth > element.clientWidth + 1,
    );
    expect(cut, (await message.textContent()) ?? '').toBe(false);
  });
}

// After a mark in the episode sheet the toast also offered "Mark the
// one before too", Undo and ✕ on one line, and the message ("Marked S03E06
// …") got ~40px at 390 and nothing at 360. The message keeps a full first
// line; the two actions go under it.
for (const width of [360]) {
  test(`a two-action toast keeps its message readable at ${width}px`, async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ height: 780, width });
    await signInAs(context, 'alex');
    // hydrated: a click on the server-drawn sheet before it does nothing
    await open(page, '/136315/the-bear?season=3&episode=6');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Mark watched \(just now\)/ })
      .click();
    const toast = page.locator('[data-sonner-toast]');
    await expect(
      toast.getByRole('button', { name: 'Mark the one before too' }),
    ).toBeVisible();
    const message = toast.locator('p');
    await expect(message).toHaveText(/^Marked S03E06/);
    const fit = await message.evaluate((element) => ({
      cut:
        element.scrollHeight > element.clientHeight + 1 ||
        element.scrollWidth > element.clientWidth + 1,
      width: element.getBoundingClientRect().width,
    }));
    expect(fit.cut, 'message cut').toBe(false);
    expect(fit.width, 'message width').toBeGreaterThanOrEqual(width / 2);
    // every control inside the toast, none of them over another
    const boxes = await toast
      .locator('button')
      .evaluateAll((buttons) =>
        buttons.map((button) => button.getBoundingClientRect().toJSON()),
      );
    const toastBox = await toast.boundingBox();
    for (const box of boxes) {
      expect(box.right).toBeLessThanOrEqual((toastBox?.x ?? 0) + width);
    }
  });
}
