import { expect, type Page, test } from '@playwright/test';

import { open } from './helpers';
import { signInAs } from './helpers/session';
import {
  episodes,
  progress,
  seasonLine,
  seasonSelect,
} from './helpers/showPage';

/**
 * Specials (season 0) on the show page:
 * the select lists them last, their wall shows like any season's, and they
 * can be marked (tap and drag on the season line), while progress, Next up
 * and time left keep counting regular episodes only. Lantern Bay (900006):
 * two seasons (14 episodes) and three specials, the third not out yet;
 * alex has seen the two aired specials and nothing else.
 */
const LANTERN_BAY = '/900006/lantern-bay';

async function openSpecials(page: Page) {
  await open(page, LANTERN_BAY);
  await expect(seasonSelect(page)).toHaveText('Season 1');
  // a key press can land before the streamed section hydrates: retry the open
  await expect(async () => {
    await seasonSelect(page).click();
    await expect(page.getByRole('option', { name: /^Specials/ })).toBeVisible({
      timeout: 1000,
    });
  }).toPass();
  const names = await page
    .getByRole('option')
    .evaluateAll((options) =>
      options.map((option) => option.textContent ?? ''),
    );
  // Specials last, after the regular seasons (a row's text runs its name
  // into its state or year: "Season 1Not started", "Season 12022 · …")
  expect(
    names.map((name) => name.match(/^(Specials|Season \d+?(?=\D|\d{4}))/)?.[0]),
  ).toEqual(['Season 1', 'Season 2', 'Specials']);
  await page.getByRole('option', { name: /^Specials/ }).click();
  await expect(seasonSelect(page)).toHaveText('Specials');
}

test(`a visitor finds the specials last in the select and sees their wall at 390`, async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 390 });
  await openSpecials(page);
  // the season line has a segment per special, the wall leads with E01
  await expect(seasonLine(page).locator('button')).toHaveCount(3);
  await expect(
    episodes(page).getByRole('heading', { name: /Christmas at the Harbour/ }),
  ).toBeVisible();
});

test('specials watched leave progress at 0 and Next up on S01E01', async ({
  context,
  page,
}) => {
  await signInAs(context, 'alex');
  await open(page, LANTERN_BAY);
  await expect(progress(page)).toContainText('0 of 14');
  await expect(
    page
      .getByTestId('route-show')
      .getByText(/Next up · S01E01/)
      .first(),
  ).toBeVisible();
  await seasonSelect(page).click();
  await expect(page.getByRole('option', { name: /^Specials/ })).toContainText(
    'E03',
  );
});

test('a drag on the specials line marks them, and progress stays put', async ({
  context,
  page,
}) => {
  await signInAs(context, 'nina');
  await openSpecials(page);
  await seasonLine(page).scrollIntoViewIfNeeded();
  const centres = await seasonLine(page)
    .locator('button')
    .evaluateAll((segments) =>
      segments.map((segment) => {
        const box = segment.getBoundingClientRect();
        return [box.left + box.width / 2, box.top + box.height / 2] as const;
      }),
    );
  const [fromX, y] = centres[0]!;
  const [toX] = centres[1]!;
  await page.mouse.move(fromX, y);
  await page.mouse.down();
  for (let step = 1; step <= 10; step += 1) {
    await page.mouse.move(fromX + ((toX - fromX) * step) / 10, y);
  }
  await page.mouse.up();
  await expect(page.getByText(/Marked S00E01–S00E02/)).toBeVisible();
  await expect(episodes(page).getByText('2 of 2 watched')).toBeVisible();
  await expect(progress(page)).toContainText('0 of 14');
});
