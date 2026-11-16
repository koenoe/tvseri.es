import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type BrowserContext, expect, type Page, test } from '@playwright/test';

/**
 * Home's "Pick one for me" roll, measured frame by frame on a production
 * build (`pick-roll.spec.ts`, `pick-roll.webkit.spec.ts`, `@perf`): how much
 * blur each frame carries against how fast the posters move, and how long
 * each frame took.
 *
 * Images: TMDB URLs are answered from `PICK_ROLL_IMG_DIR` by file name when
 * it is set (the boards' canvas images, never committed), else a pixel.
 * `PICK_ROLL_OUT` (a folder) receives the samples as JSON and a filmstrip.
 */

const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==',
  'base64',
);

export async function routeImages(context: BrowserContext) {
  const dir = process.env.PICK_ROLL_IMG_DIR;
  await context.route('https://image.tmdb.org/**', (route) => {
    const name = path.basename(new URL(route.request().url()).pathname);
    if (dir) {
      try {
        const body = readFileSync(path.join(dir, name));
        const contentType = name.endsWith('.png') ? 'image/png' : 'image/jpeg';
        return route.fulfill({ body, contentType });
      } catch {
        // not in the folder: the pixel
      }
    }
    return route.fulfill({ body: PIXEL, contentType: 'image/png' });
  });
}

export type RollSample = Readonly<{
  /** ms since the press */
  t: number;
  /** the frame's duration (rAF to rAF) */
  dt: number;
  /** the largest blur (px) on the deck or any poster in this frame */
  blur: number;
  /** the fastest poster's speed this frame (px/ms, from its box centre) */
  speed: number;
  /** the front poster's distance from where it rests (px) */
  frontOffset: number;
  /** the pick's title in the result */
  title: string;
}>;

/** The deck (from 1280px) or the reel (below), whichever is shown */
const STAGE = 'section[data-slot="pick-one"] [aria-hidden="true"]';

export async function openPick(page: Page) {
  await page.goto('/');
  // hydrated: the header's username slot stops pulsing
  await page.waitForFunction(
    () => !document.querySelector('header [data-viewer-pending]'),
  );
  const section = page.locator('section[data-slot="pick-one"]');
  await section.scrollIntoViewIfNeeded();
  // the shown posters (the other layout's are hidden and lazy)
  await page.waitForFunction(() =>
    [
      ...document.querySelectorAll<HTMLImageElement>(
        'section[data-slot="pick-one"] img',
      ),
    ]
      .filter((image) => image.checkVisibility())
      .every((image) => image.complete && image.naturalWidth > 0),
  );
  await page.waitForTimeout(300);
  return section;
}

/**
 * Presses Roll again and records every frame for `ms`. `styles: false`
 * records the frame times only (nothing read per frame, so nothing skews
 * them).
 */
export async function sampleRoll(
  page: Page,
  { ms = 1400, styles = true }: Readonly<{ ms?: number; styles?: boolean }>,
): Promise<ReadonlyArray<RollSample>> {
  return page.evaluate(
    ({ ms, selector, styles }) =>
      new Promise<RollSample[]>((resolve) => {
        const stage = [...document.querySelectorAll<HTMLElement>(selector)]
          .filter((element) => element.offsetParent !== null)
          .find((element) => element.children.length > 0);
        const button = [...document.querySelectorAll('button')].find(
          (element) => element.textContent?.includes('Roll again'),
        );
        if (!stage || !button) {
          throw new Error('no deck or button');
        }
        const heading = document.querySelector(
          'section[data-slot="pick-one"] h3',
        );
        const cards = [...stage.children] as HTMLElement[];
        const blurOf = (element: Element) => {
          const match = /blur\(([\d.]+)px\)/.exec(
            getComputedStyle(element).filter,
          );
          return match ? Number(match[1]) : 0;
        };
        const centre = (element: Element) => {
          const box = element.getBoundingClientRect();
          return [box.x + box.width / 2, box.y + box.height / 2] as const;
        };
        const stageBox = stage.getBoundingClientRect();
        const middle = [
          stageBox.x + stageBox.width / 2,
          stageBox.y + stageBox.height / 2,
        ] as const;
        const samples: RollSample[] = [];
        let last = performance.now();
        let previous = cards.map(centre);
        const start = performance.now();
        button.click();
        const frame = (now: number) => {
          const t = now - start;
          const sample = {
            blur: 0,
            dt: now - last,
            frontOffset: 0,
            speed: 0,
            t,
            title: '',
          };
          if (styles) {
            const centres = cards.map(centre);
            let speed = 0;
            for (const [index, [x, y]] of centres.entries()) {
              const [px, py] = previous[index]!;
              speed = Math.max(
                speed,
                Math.hypot(x - px, y - py) / Math.max(1, now - last),
              );
            }
            previous = centres;
            // the front poster: the one with the white ring (the highest z on the deck)
            // (the deck: the highest z; the reel: the widest slot)
            const rank = (card: HTMLElement) => {
              const z = Number(getComputedStyle(card).zIndex);
              return Number.isNaN(z) ? card.offsetWidth : z;
            };
            const front = cards.reduce((best, card) =>
              rank(card) > rank(best) ? card : best,
            );
            const [fx, fy] = centre(front);
            sample.blur = Math.max(blurOf(stage), ...cards.map(blurOf));
            sample.speed = speed;
            sample.frontOffset = Math.hypot(fx - middle[0], fy - middle[1]);
            sample.title = heading?.textContent ?? '';
          }
          samples.push(sample);
          last = now;
          if (t < ms) {
            requestAnimationFrame(frame);
          } else {
            resolve(samples);
          }
        };
        requestAnimationFrame(frame);
      }),
    { ms, selector: STAGE, styles },
  );
}

/** Frame times with nothing animating: the engine's own baseline */
export async function idleFrames(page: Page, ms = 1400): Promise<number[]> {
  return page.evaluate(
    (ms) =>
      new Promise<number[]>((resolve) => {
        const times: number[] = [];
        const start = performance.now();
        let last = start;
        const frame = (now: number) => {
          times.push(now - last);
          last = now;
          if (now - start < ms) requestAnimationFrame(frame);
          else resolve(times.slice(1));
        };
        requestAnimationFrame(frame);
      }),
    ms,
  );
}

/**
 * Screenshots of the card as fast as they come, each labelled with the ms
 * since the press (measured around the shot), then the nearest to each
 * target time.
 */
export async function filmstrip(
  page: Page,
  name: string,
  targets: ReadonlyArray<number>,
) {
  const out = process.env.PICK_ROLL_OUT;
  if (!out) {
    return [];
  }
  mkdirSync(out, { recursive: true });
  const card = page.locator(
    'section[data-slot="pick-one"] > div > div:last-child',
  );
  const box = await card.boundingBox();
  if (!box) {
    throw new Error('no card');
  }
  const shots: { at: number; body: Buffer }[] = [];
  const start = Date.now();
  await page.evaluate(() => {
    [...document.querySelectorAll('button')]
      .find((element) => element.textContent?.includes('Roll again'))
      ?.click();
  });
  while (Date.now() - start < Math.max(...targets) + 150) {
    const before = Date.now() - start;
    const body = await page.screenshot({ clip: box });
    const after = Date.now() - start;
    shots.push({ at: Math.round((before + after) / 2), body });
  }
  const picked = targets.map((target) => {
    const shot = shots.reduce((best, candidate) =>
      Math.abs(candidate.at - target) < Math.abs(best.at - target)
        ? candidate
        : best,
    );
    const file = path.join(out, `${name}-${target}ms-at-${shot.at}ms.png`);
    writeFileSync(file, shot.body);
    return { at: shot.at, file, target };
  });
  return picked;
}

export function save(name: string, data: unknown) {
  const out = process.env.PICK_ROLL_OUT;
  if (out) {
    mkdirSync(out, { recursive: true });
    writeFileSync(
      path.join(out, `${name}.json`),
      JSON.stringify(data, null, 1),
    );
  }
}

/** A short table of the curve: every ~40 ms, blur against speed */
export function curve(samples: ReadonlyArray<RollSample>) {
  const rows: string[] = [];
  let next = 0;
  for (const sample of samples) {
    if (sample.t >= next) {
      rows.push(
        `${String(Math.round(sample.t)).padStart(5)}ms blur ${sample.blur.toFixed(2)}px speed ${sample.speed.toFixed(2)}px/ms front ${sample.frontOffset.toFixed(0)}px ${sample.title}`,
      );
      next += 40;
    }
  }
  return rows.join('\n');
}

const TARGETS = [0, 120, 240, 360, 600, 900, 1100];

/**
 * The roll at 1440 (the deck) and 390 (the reel): the blur follows the
 * posters' speed and is gone before they settle, so the pick is sharp as
 * soon as it lands; no frame over 25 ms (Chromium; WebKit logs its idle
 * baseline next to the roll).
 */
export function pickRollTests() {
  for (const [width, height, look] of [
    [1440, 900, 'deck'],
    [390, 844, 'reel'],
  ] as const) {
    test(`the ${look} rolls sharp at ${width} @perf`, async ({
      browserName,
      context,
      page,
    }) => {
      await routeImages(context);
      await page.setViewportSize({ height, width });
      await openPick(page);
      const idle = await idleFrames(page);
      const timing = await sampleRoll(page, { styles: false });
      await page.waitForTimeout(600);
      const samples = await sampleRoll(page, {});
      await page.waitForTimeout(600);
      const shots = await filmstrip(page, `${browserName}-${width}`, TARGETS);
      save(`${browserName}-${width}`, { samples, shots, timing });
      const slow = timing.filter((sample) => sample.dt > 25);
      console.log(
        `${browserName} ${width}: idle ${idle.filter((dt) => dt > 25).length} of ${idle.length} over 25ms (longest ${Math.max(...idle).toFixed(1)}); roll ${timing.length} frames, longest ${Math.max(...timing.map((sample) => sample.dt)).toFixed(1)}ms, ${slow.length} over 25ms\n${curve(samples)}`,
      );
      // sharp once the posters have landed: no blur from 700ms on
      const late = samples.filter((sample) => sample.t >= 700);
      expect(Math.max(0, ...late.map((sample) => sample.blur))).toBe(0);
      // headless WebKit drops frames at 1440 with nothing animating (its
      // idle baseline is logged above), so frame times are judged in Chromium
      if (browserName === 'chromium') {
        expect(slow.length).toBe(0);
      }
    });
  }
}
