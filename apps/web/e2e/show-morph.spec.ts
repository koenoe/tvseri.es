import { expect, test } from '@playwright/test';

/**
 * Opening a show from the Home Spotlight hands its logo and art over to the
 * show page (`showMorph`): after the pointer rests on the slide (the intent
 * prefetch, so the page commits whole), the click runs one view transition
 * of the `show-open` type. Watched through `document.startViewTransition`,
 * wrapped before the app loads.
 */
test('a Spotlight slide opens its show with the morph', async ({ page }) => {
  await page.addInitScript(() => {
    const calls: Array<ReadonlyArray<string>> = [];
    Object.assign(window, { __viewTransitions: calls });
    const start = Document.prototype.startViewTransition;
    if (!start) {
      return;
    }
    Document.prototype.startViewTransition = function (
      this: Document,
      ...args: Parameters<typeof start>
    ) {
      const [options] = args;
      const types =
        typeof options === 'object' && options && 'types' in options
          ? [...(options.types ?? [])]
          : [];
      calls.push(types);
      return start.apply(this, args);
    };
  });
  await page.goto('/');
  const slide = page.getByRole('region', { name: 'Trending spotlight' });
  // hold the slideshow so the slide under the pointer stays
  await page.getByRole('button', { name: 'Pause the slideshow' }).click();
  const title = slide.getByRole('heading', { level: 2 }).getByRole('link');
  const href = (await title.first().getAttribute('href')) ?? '';
  const id = href.split('/')[1];
  await title.first().hover();
  // the intent prefetch (150ms of rest), then its request
  await page.waitForTimeout(400);
  await page.waitForLoadState('networkidle');
  await title.first().click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  const seen = await page.evaluate(() => ({
    calls: (window as unknown as { __viewTransitions: string[][] })
      .__viewTransitions,
    parts: document
      .getAnimations()
      .map((animation) => (animation.effect as KeyframeEffect).pseudoElement),
  }));
  expect(seen.calls.some((types) => types.includes('show-open'))).toBe(true);
  // the card's art grows into the page's backdrop
  expect(seen.parts).toContain(`::view-transition-group(show-art-${id})`);
});
