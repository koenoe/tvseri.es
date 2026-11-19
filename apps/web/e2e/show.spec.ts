import { expect, test } from '@playwright/test';

import { signInAs } from './helpers/session';
import { phoneScrollbars } from './helpers/viewport';

/**
 * The show page: the canonical slug redirect, 404s and the
 * hero's controls that need a browser (the Remote's keys, the prompt).
 */

test.describe('canonical URL', () => {
  test('a stale slug lands on the canonical URL, keeping the query', async ({
    page,
  }) => {
    await page.goto('/136315/wrong-slug?season=2&episode=6');
    await page.waitForURL(
      (url) =>
        url.pathname === '/136315/the-bear' &&
        url.search === '?season=2&episode=6',
    );
  });

  test('a missing slug lands on the canonical URL, keeping ?history', async ({
    page,
  }) => {
    await page.goto('/136315?history');
    await page.waitForURL(
      (url) => url.pathname === '/136315/the-bear' && url.search === '?history',
    );
  });

  test('a stale slug carries canonical + noindex', async ({ request }) => {
    const html = await (await request.get('/136315/wrong-slug')).text();
    expect(html).toMatch(
      /<link rel="canonical" href="[^"]*\/136315\/the-bear"/,
    );
    expect(html).toMatch(/<meta name="robots" content="noindex"/);
  });

  test('the canonical page has its own canonical and Open Graph', async ({
    request,
  }) => {
    const html = await (await request.get('/136315/the-bear')).text();
    expect(html).toMatch(/<title>The Bear – tvseri.es<\/title>/);
    expect(html).toMatch(
      /<link rel="canonical" href="[^"]*\/136315\/the-bear"/,
    );
    expect(html).toContain('<meta property="og:type" content="video.tv_show"');
  });
});

test('an unknown show is not found', async ({ page }) => {
  await page.goto('/999999/nothing');
  await expect(page.getByTestId('route-show')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

// Soft-404 rule: a well-formed id the API doesn't know keeps the not-found
// page out of the index; a malformed one is the static 404 (routes.spec).
test('an unknown show is noindex', async ({ request }) => {
  for (const url of ['/999999/nothing', '/99999999']) {
    const html = await (await request.get(url)).text();
    expect(html, url).toMatch(/<meta name="robots" content="noindex"/);
  }
});

// The stub's 900097 has no IMDb rating, 900098's rating read fails (500)
// (fixtures/show-hero.ts); both have The Bear's IMDb id. The badge is there
// greyed out, still a link to IMDb, in the rated badge's box, so the
// buttons sit where they sit beside a rating.
test.describe('hero without a rating', () => {
  test(`greys the IMDb badge out in the rated one's place at 390`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 390 });
    await phoneScrollbars(page, 390);
    const boxes = async (path: string) => {
      await page.goto(path);
      const imdb = page.locator('[data-slot="imdb"]');
      const actions = page.locator('[data-slot="actions"]');
      await expect(imdb).toBeVisible();
      await expect(actions).toBeVisible();
      const [badge, buttons] = await Promise.all([
        imdb.boundingBox(),
        actions.boundingBox(),
      ]);
      return { badge, buttons };
    };
    const rated = await boxes('/136315/the-bear');
    for (const path of ['/900097/no-rating', '/900098/rating-down']) {
      const unrated = await boxes(path);
      const link = page.getByRole('link', {
        name: 'Rating unavailable. Open on IMDb',
      });
      await expect(link).toHaveAttribute(
        'href',
        /^https:\/\/www\.imdb\.com\/title\/tt\d+\/$/,
      );
      await expect(link.getByText('No rating')).toBeVisible();
      // the rated badge has the placeholder's box (placeholders-show);
      // the unrated one has the rated one's
      expect(
        Math.abs((unrated.badge?.width ?? 0) - (rated.badge?.width ?? 0)),
      ).toBeLessThanOrEqual(2);
      expect(unrated.badge?.height).toBeCloseTo(rated.badge?.height ?? 0, 0);
      expect(
        Math.abs((unrated.buttons?.x ?? 0) - (rated.buttons?.x ?? 0)),
      ).toBeLessThanOrEqual(2);
    }
  });
});

test('a keyword of a theme’s set links to its theme, other keywords stay plain', async ({
  page,
}) => {
  await page.goto('/136315/the-bear');
  const keywords = page.getByRole('list', { name: 'Keywords' });
  // "workplace" is one of Workplace comedies' keywords, not its strongest
  await expect(
    keywords.getByRole('link', { exact: true, name: 'workplace' }),
  ).toHaveAttribute('href', '/theme/workplace-comedies');
  await expect(
    keywords.getByRole('link', { exact: true, name: 'family business' }),
  ).toHaveAttribute('href', '/theme/family-dramas');
  await expect(
    keywords.getByRole('link', { exact: true, name: 'chef' }),
  ).toHaveCount(0);
  await expect(keywords.getByText('chef', { exact: true })).toBeVisible();
});

test.describe('viewer', () => {
  test('the Remote opens from the …, N marks the next episode, Escape closes', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
    await page.goto('/136315/the-bear');
    const progress = page
      .getByRole('button', { name: /open watch history/ })
      .first();
    await expect(progress).toContainText('21 watched');

    const more = page
      .getByRole('button', { name: 'More actions for The Bear' })
      .first();
    await more.click();
    await expect(
      page.getByRole('menu', { name: 'Actions for The Bear' }),
    ).toBeVisible();
    await page.keyboard.press('n');
    await expect(progress).toContainText('22 watched');
    await expect(
      page.getByRole('menu', { name: 'Actions for The Bear' }),
    ).toHaveCount(0);

    await more.click();
    await expect(
      page.getByRole('menu', { name: 'Actions for The Bear' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('menu', { name: 'Actions for The Bear' }),
    ).toHaveCount(0);
    await expect(more).toBeFocused();
  });

  test('a closing Remote takes no clicks while it fades', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'alex');
    await page.goto('/136315/the-bear');
    const more = page
      .getByRole('button', { name: 'More actions for The Bear' })
      .first();
    await more.click();
    await expect(
      page.getByRole('menu', { name: 'Actions for The Bear' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    // still fading (or already gone): never pressable
    const closing = await page.evaluate(() => {
      const layer = document.querySelector<HTMLElement>('[popover]');
      return layer
        ? {
            inert: layer.inert || layer.querySelector('[inert]') !== null,
            pointer: getComputedStyle(layer).pointerEvents,
          }
        : null;
    });
    if (closing) {
      expect(closing).toEqual({ inert: true, pointer: 'none' });
    }
  });

  test('a new viewer is asked "Seen The Bear before?" until they answer', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'nina');
    await page.goto('/136315/the-bear');
    const prompt = page
      .getByRole('group', { name: 'Where are you in this series?' })
      .first();
    await expect(prompt).toContainText('Seen The Bear before?');
    // shell content: answer once the page is live (her marks say ask)
    await expect(page.locator('[data-prompt][data-ask]')).toBeVisible();
    await prompt.getByRole('button', { name: 'Just starting' }).click();
    await expect(prompt).toHaveCount(0);
    // The answer is optimistic and other actions post to the same URL (page
    // colours): reload until the saved answer is what the server renders.
    await expect(async () => {
      await page.reload();
      await expect(
        page.getByRole('group', { name: 'Where are you in this series?' }),
      ).toHaveCount(0, { timeout: 1000 });
    }).toPass({ timeout: 15_000 });
  });

  test('a signed-out visitor gets the prompt (an answer asks to sign in, Not now dismisses it here) and no personal numbers', async ({
    page,
  }) => {
    await page.goto('/136315/the-bear');
    await expect(
      page.getByRole('button', { name: 'More actions for The Bear' }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /open watch history/ }),
    ).toHaveCount(0);
    const prompt = page.getByRole('group', {
      name: 'Where are you in this series?',
    });
    await expect(prompt).toContainText('Seen The Bear before?');
    // it is in the static HTML: no space opens up after hydration
    const html = await (await page.request.get('/136315/the-bear')).text();
    expect(html).toContain('Seen The Bear before?');
    // hydrated (a click before that is the browser's, not ours)
    await page.waitForFunction(() => {
      const node = document.querySelector('[data-prompt]');
      return Boolean(
        node && Object.keys(node).some((key) => key.startsWith('__react')),
      );
    });
    await prompt.getByRole('button', { name: 'Just starting' }).click();
    await expect(
      page.getByText('Please sign in to use this feature'),
    ).toBeVisible();
    await expect(prompt).toBeVisible();
    // Not now: it fades and collapses. On a phone the episodes below glide
    // up (desktop keeps the hero's fixed height: the title block settles
    // instead). Measured in the document: scroll anchoring may keep them
    // still on screen.
    await page.setViewportSize({ height: 844, width: 390 });
    const season = page.locator('[data-slot="episodes-section"]');
    const top = () =>
      season.evaluate(
        (node) => node.getBoundingClientRect().top + window.scrollY,
      );
    const before = await top();
    await prompt.getByRole('button', { name: 'Not now' }).click();
    await expect(page.locator('[data-prompt]')).toHaveCount(0);
    expect(before - (await top())).toBeGreaterThan(50);
    // remembered on this browser: hidden before the first paint next time
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute(
      'data-show-prompt',
      'no',
    );
    await expect(prompt).toBeHidden();
  });

  test('a signed-out visitor has the progress line too: the series size, and a click asks to sign in', async ({
    page,
  }) => {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ height: width < 500 ? 844 : 900, width });
      await phoneScrollbars(page, width);
      await page.goto('/136315/the-bear');
      const line = page.getByRole('button', { name: /^Watch history: / });
      // the dots are drawn between the facts, without spaces in the text
      await expect(line).toHaveText(/^47 episodes\s*·\s*26h 51m in all$/);
      await expect(line).not.toContainText('%');
      // the same box as a signed-in viewer's line: on a phone the bar's row,
      // then the facts' (`ProgressLineLayout`)
      const box = await line.boundingBox();
      expect(box?.height).toBe(width < 500 ? 70 : 40);
      await line.click();
      await expect(
        page.getByText('Please sign in to use this feature'),
      ).toBeVisible();
      await expect(page).not.toHaveURL(/history/);
    }
  });

  test('an unreleased series asks nothing and has no whole-show mark', async ({
    page,
  }) => {
    // 900005: the stub's series that premieres after "today"
    await page.goto('/900005/before-the-premiere');
    await expect(
      page.getByRole('button', {
        name: 'More actions for Before the Premiere',
      }),
    ).toBeVisible();
    await expect(page.locator('[data-prompt]')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Not aired yet' }),
    ).toBeDisabled();
  });
});

test.describe('the prompt animates away', () => {
  test('a signed-in answer fades and collapses it, then removes it', async ({
    context,
    page,
  }) => {
    await signInAs(context, 'nina');
    await page.goto('/136315/the-bear');
    const frame = page.locator('[data-prompt]');
    // live once her marks are in (the shell's prompt hydrated and asks)
    await expect(page.locator('[data-prompt][data-ask]')).toBeVisible();
    await frame.getByRole('button', { name: 'Not now' }).click();
    // mid-exit: still there, leaving (no jump: it collapses over ~220ms)
    await expect(frame).toHaveAttribute('data-leaving', '');
    await expect(frame).toHaveCount(0);
  });
});
