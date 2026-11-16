import { type BrowserContext, expect, type Page } from '@playwright/test';

/**
 * Measuring that holds on any machine. A classic scrollbar (GitHub's macOS
 * runners, Windows, Linux; `E2E_CLASSIC_SCROLLBARS=1` locally) takes 15px of
 * the window, and `html` keeps its gutter (`scrollbar-gutter: stable`), so
 * the room a page has is `document.documentElement.clientWidth`, never the
 * viewport's width: compare boxes with each other or with what the page
 * measures here, not with numbers worked out from the viewport.
 */

/** The md breakpoint (48rem): below it a width is a phone's */
const PHONE_BELOW = 768;

/**
 * The room the page has: the window less its scrollbar (or the gutter it
 * keeps), measured with a fixed, full-window probe. `clientWidth` alone
 * reads the whole window while a scroll lock sets `overflow: hidden` on
 * `html`, though the gutter stays.
 */
export const clientSize = (page: Page) =>
  page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;inset:0;visibility:hidden;pointer-events:none';
    document.body.append(probe);
    const { height, width } = probe.getBoundingClientRect();
    probe.remove();
    return { height, width };
  });

/**
 * The x every page's content starts at: the page container (`max-w-page`,
 * centred, `--page-gutter` in from its sides), measured with a probe of the
 * same rules in the page itself. 112 at 1440 with an overlay scrollbar, 104.5
 * with a classic one; the gutter on a phone.
 */
export const pageLine = (page: Page) => page.evaluate(probePageLine);

/** Runs in the page (serialised): see `pageLine` */
export const probePageLine = (): number => {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:absolute;top:0;left:0;right:0;height:0;visibility:hidden;pointer-events:none';
  const container = document.createElement('div');
  container.style.cssText =
    'box-sizing:border-box;max-width:var(--container-page);margin-inline:auto;padding-inline:var(--page-gutter)';
  const content = document.createElement('div');
  container.append(content);
  probe.append(container);
  document.body.append(probe);
  const unset = getComputedStyle(container).maxWidth === 'none';
  const left = content.getBoundingClientRect().left;
  probe.remove();
  if (unset) {
    throw new Error('--container-page is not defined on this page');
  }
  return Math.round(left * 10) / 10;
};

/**
 * Phone widths render as a phone does: its scrollbar overlays the page and
 * takes no room. A classic one at 390 would leave the page 375px while the
 * media queries still see 390 (`min-[390px]:` rules applied to 375px of room),
 * a state no phone has. Call it before the first navigation; wider viewports
 * keep the machine's scrollbar.
 */
export async function phoneScrollbars(
  target: BrowserContext | Page,
  width: number,
): Promise<void> {
  if (width >= PHONE_BELOW) return;
  await target.addInitScript(() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('html{scrollbar-width:none!important}');
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  });
}

/**
 * Waits `count` animation frames: what a scroll or input needs to reach its
 * handlers and be painted. The window a check that something did NOT happen
 * waits (a locked scroll stays put), where there is no condition to poll.
 */
export const nextFrames = (page: Page, count = 2) =>
  page.evaluate(
    (frames) =>
      new Promise<void>((resolve) => {
        const step = (left: number) =>
          left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
        step(frames);
      }),
    count,
  );

/**
 * The text has its fonts: a layout first, so the fonts the text needs have
 * been asked for (`document.fonts.ready` is already resolved while none is
 * loading), then the fonts. No animation frame: it also runs on a page with
 * JavaScript off, where none comes.
 */
export async function fontsSettled(page: Page): Promise<void> {
  await page.evaluate(async () => {
    document.body.getBoundingClientRect();
    await document.fonts.ready;
  });
}

/**
 * Polls `read` (every 100ms) until it has returned the same value for
 * `quietMs`: a layout that has stopped moving, where a fixed sleep would
 * guess.
 */
export async function untilStable(
  read: () => Promise<unknown>,
  options: Readonly<{
    message: string;
    quietMs?: number;
    timeout?: number;
  }>,
): Promise<void> {
  const reads = Math.max(1, Math.ceil((options.quietMs ?? 200) / 100));
  let last = '';
  let same = 0;
  await expect
    .poll(
      async () => {
        const now = JSON.stringify(await read());
        same = now === last ? same + 1 : 0;
        last = now;
        return same;
      },
      {
        intervals: [100],
        message: options.message,
        timeout: options.timeout ?? 10_000,
      },
    )
    .toBeGreaterThanOrEqual(reads);
}
