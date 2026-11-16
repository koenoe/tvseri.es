import { expect, type Page, test } from '@playwright/test';

import { expectHydrated } from './helpers';
import { failRead, signInAs } from './helpers/session';

/**
 * Connected by, the toy of the day. Tue 17 Nov
 * 2026 plans it for everyone (not an If you liked X day), so the page is
 * pinned there through `/dev/home?day=` (served in the e2e build only).
 * The stub (`fixtures/home/toy.ts`): signed out, three paths from Malcolm
 * in the Middle; `GET /home/connected?from=` answers five paths from any
 * show it knows, ending at Dept. Q, MobLand, Succession, Black Mirror, Six
 * Feet Under and Shameless. alex (the profile rig's library) has MobLand
 * and finished shows of her own; nina has an empty library.
 */
const DAY = '/dev/home?day=2026-11-17';

const card = (page: Page) => page.getByRole('region', { name: 'Connected by' });
const title = (page: Page) => card(page).getByRole('heading', { level: 3 });
const another = (page: Page) =>
  card(page).getByRole('button', { name: 'Another path' });
/** The end's Watchlist on screen (the head's from md, the path's foot on a phone) */
const watchlist = (page: Page, end: string) =>
  card(page)
    .getByRole('button', { name: `Add ${end} to your watchlist` })
    .locator('visible=true');

/** Holds every server action: list writes stay optimistic, nothing settles */
const holdWrites = (page: Page) =>
  page.route('**/*', (route) =>
    route.request().method() === 'POST' &&
    route.request().headers()['next-action']
      ? undefined
      : route.fallback(),
  );

/** The titles "Another path" steps through, from the first back to it */
async function titles(page: Page, count: number) {
  const seen: string[] = [];
  for (let step = 0; step < count; step++) {
    seen.push(((await title(page).textContent()) ?? '').trim());
    await another(page).click();
  }
  return seen;
}

test.describe('Connected by', () => {
  test('signed out: the day’s paths, two steps each, with the end’s Watchlist beside Another path', async ({
    page,
  }) => {
    await page.goto(DAY);
    await expect(title(page)).toHaveText(
      'Malcolm in the Middle to Better Call Saul, in 2 steps',
    );
    // five nodes: show, person, show, person, show
    await expect(card(page).getByRole('link')).toHaveCount(5);
    const add = watchlist(page, 'Better Call Saul');
    await expect(add).toHaveText('Watchlist');
    // a pair: Watchlist, then Another path, on one line
    const [addBox, anotherBox] = await Promise.all([
      add.boundingBox(),
      another(page).boundingBox(),
    ]);
    expect(Math.round(addBox?.y ?? -1)).toBe(Math.round(anotherBox?.y ?? -2));
    expect((addBox?.x ?? 0) + (addBox?.width ?? 0)).toBeLessThan(
      anotherBox?.x ?? 0,
    );

    expect(await titles(page, 4)).toEqual([
      'Malcolm in the Middle to Better Call Saul, in 2 steps',
      'Malcolm in the Middle to The Mandalorian, in 2 steps',
      'Malcolm in the Middle to Westworld, in 2 steps',
      'Malcolm in the Middle to Better Call Saul, in 2 steps',
    ]);
  });

  test('signed out: Watchlist asks to sign in', async ({ page }) => {
    await page.goto(DAY);
    // a click before the button hydrates does nothing
    const button = watchlist(page, 'Better Call Saul');
    await expectHydrated(button);
    await button.click();
    await expect(
      page.getByText('Please sign in to use this feature'),
    ).toBeVisible();
  });

  test('signed in: from a show the viewer finished, ends in none of their lists; Watchlist adds', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
    await holdWrites(page);
    await page.goto(DAY);
    await expect(title(page)).toHaveText(/ to Dept\. Q, in 2 steps$/);
    const [start] = ((await title(page).textContent()) ?? '').split(' to ');
    // one of alex's own shows, not the day's shared start
    expect(start).not.toBe('Malcolm in the Middle');

    // MobLand (in alex's lists) is left out; three steps lead back to the first
    expect(await titles(page, 3)).toEqual(
      ['Dept. Q', 'Succession', 'Black Mirror'].map(
        (end) => `${start} to ${end}, in 2 steps`,
      ),
    );

    await watchlist(page, 'Dept. Q').click();
    await expect(
      card(page)
        .getByRole('button', { name: 'Remove Dept. Q from your watchlist' })
        .locator('visible=true'),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('signed in with an empty library: from the day’s start, every end new', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'nina');
    await page.goto(DAY);
    await expect(title(page)).toHaveText(
      'Malcolm in the Middle to Dept. Q, in 2 steps',
    );
    expect(await titles(page, 3)).toEqual(
      ['Dept. Q', 'MobLand', 'Succession'].map(
        (end) => `Malcolm in the Middle to ${end}, in 2 steps`,
      ),
    );
  });

  test('signed in, the library unreadable: the day’s shared paths, never the slot’s error', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'nina');
    await failRead('nina', '/me/library-ids');
    await page.goto(DAY);
    await expect(title(page)).toHaveText(
      'Malcolm in the Middle to Better Call Saul, in 2 steps',
    );
  });
});

test.describe('Connected by on a phone', () => {
  test.use({ viewport: { height: 844, width: 390 } });

  test('the head stays stacked with Another path; the Watchlist sits under the path', async ({
    page,
  }) => {
    await page.goto(DAY);
    // the shell's card (the shared paths, signed out) is replaced by the
    // streamed one with the same paths: act on the streamed card
    await expect(
      page
        .locator('[data-signed-out-only]')
        .getByRole('region', { name: 'Connected by' }),
    ).toHaveCount(0);
    await card(page).scrollIntoViewIfNeeded();
    const add = watchlist(page, 'Better Call Saul');
    await expect(add).toBeVisible();
    const [addBox, anotherBox, lastShow] = await Promise.all([
      add.boundingBox(),
      another(page).boundingBox(),
      card(page).getByRole('link', { name: 'Better Call Saul' }).boundingBox(),
    ]);
    expect(anotherBox?.y ?? 0).toBeLessThan(lastShow?.y ?? 0);
    expect(addBox?.y ?? 0).toBeGreaterThan(
      (lastShow?.y ?? 0) + (lastShow?.height ?? 0),
    );
    // centred under the path
    const cardBox = await card(page).boundingBox();
    const middle = (addBox?.x ?? 0) + (addBox?.width ?? 0) / 2;
    expect(
      Math.abs(middle - ((cardBox?.x ?? 0) + (cardBox?.width ?? 0) / 2)),
    ).toBeLessThanOrEqual(2);
  });
});
