import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { afterRelease } from './helpers/instantRelease';
import { signInAs, stubApiAs } from './helpers/session';

/**
 * Circle (`/u/{username}/circle`): your
 * follows ranked by taste match and who to follow back; on someone else's
 * profile, who they follow and who follows them. Taste match and discovery,
 * never a race: no rank numbers, no leaderboard.
 */

const rowNames = (page: Page, section: string) =>
  page
    .getByRole('region', { name: section })
    .getByRole('listitem')
    .getByRole('link');

/** A person's row: the list item holding the link named with their username */
const person = (page: Page, username: string, section?: string) =>
  (section ? page.getByRole('region', { name: section }) : page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { exact: true, name: username }) });

test.describe('your own Circle', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page.context(), 'alex');
  });

  test('is instant on an initial load, and from the tab', async ({
    page,
    baseURL,
  }) => {
    await instant(
      page,
      async () => {
        await page.goto('/u/alex/circle');
        await expect(
          page.getByRole('navigation', { name: 'Profile' }),
        ).toBeVisible();
        // the match key and the rows' placeholder are in the shell
        await expect(
          page.getByRole('heading', { name: 'How a match is made' }),
        ).toBeVisible();
        await expect(page.locator('[data-placeholder="circle"]')).toBeVisible();
      },
      { baseURL },
    );
    await expect(rowNames(page, 'You follow').first()).toBeVisible({
      timeout: afterRelease(),
    });

    await page.goto('/u/alex');
    await expect(page.getByRole('heading', { name: 'Up next' })).toBeVisible();
    await instant(page, async () => {
      await page
        .getByRole('navigation', { name: 'Profile' })
        .getByRole('link', { name: 'Circle' })
        .click();
      await page.waitForURL('**/u/alex/circle');
      await expect(
        page.getByRole('heading', { name: 'How a match is made' }),
      ).toBeVisible();
    });
    await expect(page.getByRole('heading', { name: 'Circle' })).toBeVisible({
      timeout: afterRelease(),
    });
  });

  test('ranks who you follow by match, then who to follow back', async ({
    page,
  }) => {
    await page.goto('/u/alex/circle');
    await expect(page.getByText('8 following · 6 followers')).toBeVisible();
    await expect(rowNames(page, 'You follow')).toHaveText([
      'juno',
      'tamsin',
      'oskar',
      'bea',
      'leo',
      'rumi',
      'ivo',
      'wren',
    ]);
    const juno = person(page, 'juno');
    await expect(juno.getByText(/^\d+ shared series$/)).toBeVisible();
    await expect(juno.getByText('Super match')).toBeVisible();
    await expect(
      juno.getByText('Follows you').filter({ visible: true }),
    ).toBeVisible();
    await expect(juno.getByText('Watching', { exact: true })).toBeVisible();
    await expect(juno.getByRole('button', { name: 'Following' })).toBeVisible();
    // no posters and no New to you on the rows
    await expect(juno.locator('img')).toHaveCount(0);
    await expect(page.getByText('New to you')).toHaveCount(0);
    // a row with nothing in progress says so
    await expect(
      person(page, 'rumi').getByText('Not watching anything right now'),
    ).toBeVisible();

    await expect(rowNames(page, 'Follows you')).toHaveText(['sam', 'noor']);
  });

  test('a row opens their profile', async ({ page }) => {
    await page.goto('/u/alex/circle');
    await person(page, 'tamsin').getByRole('link').click();
    await page.waitForURL('**/u/tamsin');
  });

  test('Follow back is instant and the count follows', async ({ page }) => {
    await page.goto('/u/alex/circle');
    const sam = person(page, 'sam', 'Follows you');
    await sam.getByRole('button', { name: 'Follow back' }).click();
    await expect(sam.getByRole('button', { name: 'Following' })).toBeVisible();
    await expect(page.getByText('9 following · 6 followers')).toBeVisible();
    // the page's refresh moves sam among the people you follow
    await expect(rowNames(page, 'You follow')).toContainText(['sam']);
    await expect(rowNames(page, 'Follows you')).toHaveText(['noor']);
    await expect(page.getByText('9 following · 6 followers')).toBeVisible();
  });

  test('following nobody: one calm card, then who follows you', async ({
    page,
  }) => {
    const people = (await (
      await stubApiAs('alex', '/me/circle/people')
    ).json()) as { following: ReadonlyArray<{ id: string }> };
    for (const { id } of people.following) {
      await stubApiAs('alex', `/user/${id}/unfollow`, { method: 'DELETE' });
    }
    await page.goto('/u/alex/circle');
    const following = page.getByRole('region', { name: 'You follow' });
    await expect(
      following.getByText('You don’t follow anyone yet'),
    ).toBeVisible();
    await expect(
      following.getByText(
        'Follow someone from their profile; the four people below already follow you.',
      ),
    ).toBeVisible();
    await expect(rowNames(page, 'Follows you')).toHaveText([
      'sam',
      'noor',
      'wren',
      'juno',
    ]);
    await expect(
      page
        .getByRole('region', { name: 'Follows you' })
        .getByRole('button', { name: 'Follow back' }),
    ).toHaveCount(4);
    // no "closest taste first", no match key
    await expect(page.getByText('closest taste first')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'How a match is made' }),
    ).toBeHidden();
  });
});

test.describe('someone else’s Circle', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page.context(), 'alex');
  });

  test('lists who they follow and who follows them, without a match', async ({
    page,
  }) => {
    await page.goto('/u/juno/circle');
    await expect(
      page.getByRole('heading', { name: 'juno’s circle' }),
    ).toBeVisible();
    await expect(rowNames(page, 'juno follows')).toHaveText(['alex']);
    await expect(rowNames(page, 'Follows juno')).toContainText(['alex', 'ivo']);
    const you = person(page, 'alex', 'juno follows');
    await expect(
      you.getByText('It’s you').filter({ visible: true }),
    ).toBeVisible();
    await expect(you.getByText('Dexter: Resurrection')).toBeVisible();
    await expect(you.getByRole('button')).toHaveCount(0);
    // your match with that person is on their profile, not here
    await expect(page.getByText(/shared series$/)).toHaveCount(0);
    // no match key in someone else's sidebar
    await expect(
      page.getByRole('heading', { name: 'How a match is made' }),
    ).toHaveCount(0);
  });
});

/**
 * Following nobody and followed by nobody, the tab still shows: the page
 * says so, for the owner (`kit`) and for a visitor.
 */
test.describe('a Circle with no follows either way', () => {
  test('your own: the tab, and how to follow someone', async ({ page }) => {
    await signInAs(page.context(), 'kit');
    await page.goto('/u/kit');
    await page
      .getByRole('navigation', { name: 'Profile' })
      .getByRole('link', { name: 'Circle' })
      .click();
    await page.waitForURL('**/u/kit/circle');
    await expect(
      page.getByText('You don’t follow anyone yet', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Follow someone from their profile.', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Find people' }),
    ).toBeVisible();
    await expect(page.getByRole('region', { name: 'Follows you' })).toHaveCount(
      0,
    );
  });

  test('someone else’s: the tab, and both lists say they are empty', async ({
    page,
  }) => {
    await signInAs(page.context(), 'alex');
    await page.goto('/u/kit');
    await page
      .getByRole('navigation', { name: 'Profile' })
      .getByRole('link', { name: 'Circle' })
      .click();
    await page.waitForURL('**/u/kit/circle');
    await expect(
      page.getByText('kit doesn’t follow anyone yet', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Nobody follows kit yet', { exact: true }),
    ).toBeVisible();
  });
});
