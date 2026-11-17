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
  test('signed out: the day’s paths, two steps each, Another path the head’s only action', async ({
    page,
  }) => {
    await page.goto(DAY);
    await expect(title(page)).toHaveText(
      'Malcolm in the Middle to Better Call Saul, in 2 steps',
    );
    // five nodes: show, person, show, person, show
    await expect(card(page).getByRole('link')).toHaveCount(5);
    // no Watchlist for the end: the card's one button is Another path
    await expect(
      card(page).getByRole('button').locator('visible=true'),
    ).toHaveText(['Another path']);
    // a click before the button hydrates does nothing
    await expectHydrated(another(page));

    expect(await titles(page, 4)).toEqual([
      'Malcolm in the Middle to Better Call Saul, in 2 steps',
      'Malcolm in the Middle to The Mandalorian, in 2 steps',
      'Malcolm in the Middle to Westworld, in 2 steps',
      'Malcolm in the Middle to Better Call Saul, in 2 steps',
    ]);
  });

  test('signed in: from a show the viewer finished, ends in none of their lists', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
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

  test('the head stays stacked with Another path, centred above the path; no Watchlist under it', async ({
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
    await expect(another(page)).toBeVisible();
    await expect(
      card(page).getByRole('button').locator('visible=true'),
    ).toHaveCount(1);
    const [anotherBox, lastShow, cardBox] = await Promise.all([
      another(page).boundingBox(),
      card(page).getByRole('link', { name: 'Better Call Saul' }).boundingBox(),
      card(page).boundingBox(),
    ]);
    expect(anotherBox?.y ?? 0).toBeLessThan(lastShow?.y ?? 0);
    // centred in the card
    const middle = (anotherBox?.x ?? 0) + (anotherBox?.width ?? 0) / 2;
    expect(
      Math.abs(middle - ((cardBox?.x ?? 0) + (cardBox?.width ?? 0) / 2)),
    ).toBeLessThanOrEqual(2);
  });
});
