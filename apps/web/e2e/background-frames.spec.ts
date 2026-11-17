import { expect, type Page, test } from '@playwright/test';

import {
  type Frame,
  framesAfter,
  readFrames,
  recordFrames,
  rgb,
  withRoute,
} from './helpers/frames';
import { phoneScrollbars } from './helpers/viewport';

/**
 * The page colour frame by frame, on a production build: every frame on
 * which a page is on screen has that page's colour (the variable, the
 * surfaces and Home's ground), nothing on those surfaces animates when a
 * page is loaded or shown again, and Home's spotlight comes back on the
 * slide it was left on, on the first frame back, whether the page was kept
 * alive (Activity) or rebuilt after more pages than the router keeps.
 */

/** A tiny PNG for every TMDB image, so backdrops load (and decode) locally */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==',
  'base64',
);

const SHOW = '/1396/breaking-bad';
/** How long the recorder samples after each navigation event */
const WINDOW = 1500;

/**
 * The last event's recording window has closed: every frame of it is in (the
 * recorder says when it stops, so this waits for its end, not for a guess of
 * it).
 */
const windowClosed = (page: Page) =>
  expect
    .poll(
      async () => {
        const { events, frames, recording } = await readFrames(page);
        const last = frames.at(-1);
        // the recorder has stopped: the window ran out, also past the last
        // change of the routes on screen
        return (
          last !== undefined && last.event === events.length - 1 && !recording
        );
      },
      { message: 'the recording window closes' },
    )
    .toBe(true);

test.beforeEach(async ({ context, page }) => {
  await context.route('https://image.tmdb.org/**', (route) =>
    route.fulfill({ body: PIXEL, contentType: 'image/png' }),
  );
  await recordFrames(context, WINDOW);
  await page.setViewportSize({ height: 900, width: 1440 });
});

/** The page as it settled: its colour and the spotlight's slide */
const settled = (page: Page) =>
  page.evaluate(() => ({
    color: getComputedStyle(document.documentElement)
      .getPropertyValue('--main-background-color')
      .trim(),
    slide:
      document
        .querySelector('[data-slot="spotlight"] [aria-current="true"]')
        ?.getAttribute('aria-label') ?? null,
  }));

/**
 * Every frame shows `color` on the variable and the surfaces that paint it
 * (at least one frame, unless `some` is false)
 */
function expectColour(
  frames: ReadonlyArray<Frame>,
  color: string,
  { some = true } = {},
) {
  if (some) {
    expect(frames.length).toBeGreaterThan(0);
  }
  const wrong = frames.filter(
    (frame) =>
      frame.pageColor !== color ||
      frame.body !== rgb(color) ||
      (frame.main !== null && frame.main !== rgb(color)) ||
      (frame.ground !== null && frame.ground !== rgb(color)),
  );
  expect(wrong).toEqual([]);
}

/** Nothing on the page colour's surfaces (the backdrop included) animates */
function expectStill(frames: ReadonlyArray<Frame>) {
  expect(frames.flatMap((frame) => frame.animations)).toEqual([]);
}

/**
 * Home on `slide` (`3 of 10: …`): the pager, and its artwork alone, drawn in
 * full on every frame
 */
function expectSlide(frames: ReadonlyArray<Frame>, slide: string) {
  const index = String(Number(slide.split(' ')[0]) - 1);
  for (const frame of frames) {
    expect(frame.slide).toBe(slide);
    expect(frame.artwork).toEqual([{ index, opacity: 1 }]);
  }
}

const pager = (page: Page, n: number) =>
  page
    .getByRole('region', { name: 'Trending spotlight' })
    .getByRole('group', { name: 'Trending series' })
    .getByRole('button', { name: new RegExp(`^${n} of 10: `) });

/** Home on slide 3, paused there, its colour settled */
async function homeOnSlide3(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.getByRole('button', { name: 'Pause the slideshow' }).click();
  await pager(page, 3).click();
  await expect
    .poll(async () => (await settled(page)).slide)
    .toMatch(/^3 of 10: /);
  // the slide has switched (the pager follows a press at once, the slide
  // once its backdrop is decoded), and the switch's transitions and fades
  // have ended
  await expect(
    page
      .getByRole('region', { name: 'Trending spotlight' })
      .getByRole('group', { name: /^3 of 10: / }),
  ).toBeVisible();
  await page.waitForFunction(() =>
    document.getAnimations().every(
      (animation) =>
        animation.playState !== 'running' ||
        // the slideshow's own countdown is the timer, not part of the switch
        (animation as CSSAnimation).animationName?.includes(
          'spotlight-countdown',
        ) ||
        animation.effect?.getComputedTiming().iterations ===
          Number.POSITIVE_INFINITY,
    ),
  );
  return settled(page);
}

/** A route's root on screen (pages kept alive are in the DOM, hidden) */
const onScreen = (page: Page, route: string) =>
  page.locator(`[data-testid="${route}"]:visible`);

/** A client navigation by a link, wherever it is (no scroll) */
async function follow(page: Page, href: string, route: string) {
  await page.locator(`a[href^="${href}"]`).first().dispatchEvent('click');
  await expect(onScreen(page, route)).toBeVisible();
  await windowClosed(page);
}

async function back(page: Page) {
  await page.goBack();
  await expect(onScreen(page, 'route-home')).toBeVisible();
  await windowClosed(page);
}

for (const viewport of [
  { height: 900, width: 1440 },
  { height: 844, width: 390 },
] as const) {
  test(`a hard load of Home paints its colour with the page, still, at ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await phoneScrollbars(page, viewport.width);
    await page.goto('/');
    await windowClosed(page);
    const home = await settled(page);
    // the first slide's colour, from the server HTML on
    const frames = withRoute(await framesAfter(page, 'load'), 'route-home');
    expectColour(frames, home.color);
    expectStill(frames);
    // the first slide's artwork, drawn in full from the frame it is on screen
    expect(frames.at(-1)?.artwork).toHaveLength(1);
    expectSlide(
      frames.filter((frame) => frame.artwork.length > 0),
      home.slide ?? '',
    );
  });
}

test('a hard load of a show page paints its colour with the page, still', async ({
  page,
}) => {
  await page.goto(SHOW);
  await windowClosed(page);
  const show = await settled(page);
  expect(show.color).toBe('#632a6f');
  const frames = withRoute(await framesAfter(page, 'load'), 'route-show');
  expectColour(frames, show.color);
  expectStill(frames);
});

test('forward, each page is on screen in its own colour only', async ({
  page,
}) => {
  await page.goto('/');
  await windowClosed(page);
  const home = await settled(page);
  await follow(page, SHOW, 'route-show');
  const show = await settled(page);
  expect(show.color).not.toBe(home.color);
  const frames = await framesAfter(page, 'push');
  // the outgoing page never takes the incoming colour, and the reverse
  expectColour(withRoute(frames, 'route-home'), home.color, { some: false });
  expectColour(withRoute(frames, 'route-show'), show.color);
  expectStill(withRoute(frames, 'route-show'));
});

for (const [how, open] of [
  // the slide's own link, pressed: the spotlight has the pointer and focus
  [
    'the slide',
    (page: Page) =>
      page
        .getByRole('region', { name: 'Trending spotlight' })
        .getByRole('group', { name: /^3 of 10: / })
        .getByRole('link')
        .first()
        .click(),
  ],
  ['a row', (page: Page) => follow(page, SHOW, 'route-show')],
] as const) {
  test(`back to Home kept alive (left by ${how}): the slide it was left on, on the first frame, still`, async ({
    page,
  }) => {
    const home = await homeOnSlide3(page);
    await open(page);
    await expect(page).not.toHaveURL(/\/$/);
    await windowClosed(page);
    await back(page);
    const frames = withRoute(await framesAfter(page, 'pop'), 'route-home');
    expectColour(frames, home.color);
    expectStill(frames);
    expectSlide(frames, home.slide ?? '');
  });
}

test('back to Home rebuilt after more pages than the router keeps: the slide it was left on, on the first frame, still', async ({
  page,
}) => {
  const home = await homeOnSlide3(page);
  await follow(page, SHOW, 'route-show');
  await follow(page, '/genre/crime', 'landing-crumb');
  await follow(page, '/100027/', 'route-show');
  // the router keeps three pages: Home is gone
  await expect(page.locator('[data-home-ground]')).toHaveCount(0);
  await page.goBack();
  await page.goBack();
  await expect(onScreen(page, 'route-show')).toBeVisible();
  await back(page);
  const frames = withRoute(await framesAfter(page, 'pop'), 'route-home');
  expectColour(frames, home.color);
  expectStill(frames);
  expectSlide(frames, home.slide ?? '');
});

test('forward to Home kept alive (the logo): slide 1 at once, still', async ({
  page,
}) => {
  await page.goto('/');
  await windowClosed(page);
  const first = await settled(page);
  expect(first.slide).toMatch(/^1 of 10: /);
  await homeOnSlide3(page);
  await follow(page, SHOW, 'route-show');
  await page.getByRole('link', { name: 'tvseri.es home' }).first().click();
  await expect(onScreen(page, 'route-home')).toBeVisible();
  await windowClosed(page);
  const frames = withRoute(await framesAfter(page, 'push'), 'route-home');
  expectColour(frames, first.color);
  expectStill(frames);
  expectSlide(frames, first.slide ?? '');
});
