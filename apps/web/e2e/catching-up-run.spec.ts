import { expect, type Locator, test } from '@playwright/test';

import { signInAs } from './helpers/session';

/**
 * The Catching up run moves on as chips are marked: tapping the
 * fourth chip marks the four, and the next four slide into their spots,
 * with "+N", the count, the time left and Next up following. `kit` has The
 * Long Run waiting: 84 episodes from S07E07, the API's eight codes sent
 * (`fixtures/user-profile/states.ts`). The marks go through the marking
 * routes and settle; the run stays moved on, also past the codes sent, and
 * an Undo after the overview was read again moves it back. kit's overview
 * is read from the stub's marks, as the API's would be.
 */

test.use({ viewport: { height: 900, width: 1440 } });

test.beforeEach(async ({ page }) => {
  await signInAs(page.context(), 'kit');
});

const chip = (block: Locator, episode: number) =>
  block.getByRole('button', {
    name: `Mark up to S07E${String(episode).padStart(2, '0')} as watched`,
  });

const more = (block: Locator, count: number) =>
  block
    .getByRole('link', { name: `${count} more waiting in season 7` })
    .filter({ visible: true });

test('marking up to the fourth chip moves the run on', async ({ page }) => {
  await page.goto('/u/kit');
  const block = page.getByRole('region', { name: 'Catching up' });
  await block.scrollIntoViewIfNeeded();

  for (const episode of [7, 8, 9, 10]) {
    await expect(chip(block, episode)).toBeVisible();
  }
  await expect(more(block, 80)).toBeVisible();
  await expect(block.getByText('84 episodes waiting')).toBeVisible();
  await expect(block.getByText('61h 36m')).toBeVisible();
  await expect(block.getByText(/^S07E07/)).toBeVisible();

  const marked = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      Boolean(response.request().headers()['next-action']),
  );
  await chip(block, 10).click();

  // at once (optimistic): E07 to E10 leave, E11 to E14 take their spots
  for (const episode of [11, 12, 13, 14]) {
    await expect(chip(block, episode)).toBeVisible();
  }
  for (const episode of [7, 8, 9, 10]) {
    await expect(chip(block, episode)).toHaveCount(0);
  }
  await expect(more(block, 76)).toBeVisible();
  await expect(block.getByText('80 episodes waiting')).toBeVisible();
  await expect(block.getByText('58h 40m')).toBeVisible();
  // the tapped chip's spot keeps the focus (WCAG 2.4.3)
  await expect(chip(block, 14)).toBeFocused();
  // off the run (the pointer may still hover the spot, now E14, whose line
  // says what's left after it), the line is Next up again
  await page.mouse.move(0, 0);
  await expect(block.getByText(/^S07E11/)).toBeVisible();

  // the write went through and nothing rolled back
  expect((await marked).ok()).toBe(true);
  await expect(chip(block, 11)).toBeVisible();
  await expect(block.getByText('80 episodes waiting')).toBeVisible();

  // E14 marks the rest of the eight codes sent: the run goes on at once from
  // the marking store, never a lone "+N", and the overview is read again.
  // The press is refused until the first write settled (one press, one
  // write), so it is tried until taken.
  await expect(async () => {
    await chip(block, 14).click();
    await expect(chip(block, 15)).toBeVisible({ timeout: 500 });
  }).toPass();
  for (const episode of [15, 16, 17, 18]) {
    await expect(chip(block, episode)).toBeVisible();
  }
  await expect(chip(block, 14)).toHaveCount(0);
  await expect(more(block, 72)).toBeVisible();
  await expect(block.getByText('76 episodes waiting')).toBeVisible();
  await expect(block.getByText('55h 44m')).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(block.getByText(/^S07E15/)).toBeVisible();

  // the refreshed overview sends E15's runtime (the store alone doesn't
  // know it): its hover line has the time left
  await expect(async () => {
    await page.mouse.move(0, 0);
    await chip(block, 15).hover();
    await expect(block.getByText(/^Watched up to E15 · \d+h/)).toBeVisible({
      timeout: 500,
    });
  }).toPass();
  await page.mouse.move(0, 0);

  // Undo of E11 to E14 after that refresh: the run moves back at once, and
  // the overview is read again, so the count and the time are the server's
  await page.getByRole('button', { name: 'Undo' }).last().click();
  for (const episode of [11, 12, 13, 14]) {
    await expect(chip(block, episode)).toBeVisible();
  }
  await expect(chip(block, 15)).toHaveCount(0);
  await expect(more(block, 76)).toBeVisible();
  await expect(block.getByText('80 episodes waiting')).toBeVisible();
  await expect(block.getByText('58h 40m')).toBeVisible();
  // focus may come back to the run's chip as the toast closes, and a
  // focused chip's line is its own; with nothing focused it is Next up
  // (after the toast's exit, so this is retried)
  await expect(async () => {
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
    await expect(block.getByText(/^S07E11/)).toBeVisible({ timeout: 500 });
  }).toPass();
});
