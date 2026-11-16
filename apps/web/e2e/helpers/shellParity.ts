import { instant } from '@next/playwright';
import { expect, type Page } from '@playwright/test';

import {
  type Boxes,
  type Parity,
  readBoxes,
  readShifts,
  SHIFT_OBSERVER,
} from './parity';

/**
 * Placeholder parity: a loading placeholder occupies the same box as the
 * content that replaces it, and nothing moves when the content arrives.
 *
 * The fallback carries `data-placeholder="<name>"`, the content container
 * `data-slot="<name>"` (the only markup added for testing). `instant()` holds
 * the page at its static shell, so every fallback is on screen; the boxes are
 * recorded there, the lock is released, and the same names are measured again
 * on the finished page.
 */

const shotPath = (name: string | undefined, kind: string) =>
  name && process.env.PLACEHOLDER_SHOTS
    ? `${process.env.PLACEHOLDER_SHOTS}/${name}-${kind}.png`
    : undefined;

const documentHeight = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollHeight);

const visiblePlaceholders = (page: Page, except: ReadonlyArray<string> = []) =>
  page
    .evaluate(
      (names) =>
        [...document.querySelectorAll('[data-placeholder]')].filter(
          (element) =>
            element.getClientRects().length > 0 &&
            !names.includes(element.getAttribute('data-placeholder') ?? ''),
        ).length,
      except,
    )
    // a navigation mid-poll (a dev recompile): ask again
    .catch(() => -1);

/**
 * No placeholder on screen (but the viewer's own, `except`) and no section
 * in its "didn’t load" state
 */
const shellIsWhole = async (page: Page, except?: ReadonlyArray<string>) =>
  (await visiblePlaceholders(page, except)) === 0 &&
  (await page.getByText(/didn.t load/i).count()) === 0;

/** Asks for the shell until it carries the page's own `text` (see `shellText`). */
async function waitForOwnShell(
  page: Page,
  goto: () => Promise<unknown>,
  text: string,
  baseURL?: string,
  whole?: boolean,
  viewerHoles?: ReadonlyArray<string>,
) {
  const deadline = Date.now() + 90_000;
  for (let attempt = 1; ; attempt += 1) {
    let own = false;
    await instant(
      page,
      async () => {
        await goto();
        own = await page
          .getByText(text)
          .first()
          .waitFor({ state: 'attached', timeout: 4000 })
          .then(() => true)
          .catch(() => false);
        if (own && whole) {
          // no placeholder, and no section in its "didn’t load" state (a
          // failed read cached for 30 s, which regenerates to a taller one)
          own = await shellIsWhole(page, viewerHoles);
        }
      },
      baseURL ? { baseURL } : undefined,
    );
    if (own) {
      if (attempt > 1) {
        // evidence for the report: how often the generic shell was served
        console.log(
          `[shell] ${text.slice(0, 30)}: own shell on try ${attempt}`,
        );
      }
      return;
    }
    expect(Date.now(), `the shell never carried "${text}"`).toBeLessThan(
      deadline,
    );
    await page.waitForTimeout(2000);
  }
}

/** `Parity` plus the document's height before and after the content arrived */
export type InstantParity = Parity &
  Readonly<{ documentHeight: Readonly<{ after: number; before: number }> }>;

/**
 * Loads a route at its static shell, records the placeholders, lets the
 * content arrive and records the slots. Returns both; `expectParity` asserts.
 *
 * `goto` runs inside `instant()`: it must only navigate (plus assertions that
 * hold at the shell). `ready` waits for the shell to be on screen.
 */
export async function measureParity(
  page: Page,
  options: Readonly<{
    goto: () => Promise<unknown>;
    /** Waits (inside `instant()`) until the shell's placeholders are drawn. */
    ready: () => Promise<unknown>;
    baseURL?: string;
    /**
     * Text only the page's own prerendered shell carries (a prerendered
     * show's description, a person's name). Until the shell shows it the
     * route is serving its generic shell (the entry is regenerating, or was
     * built while a read failed and is cached for 30 s), which is another
     * page's placeholder: wait for the page's own, then measure.
     */
    shellText?: string;
    /**
     * The shell has no placeholder on screen and no failed section
     * (everything is prerendered into it): until then a read of the page
     * failed or is regenerating, and the shell has holes the test does not
     * expect. The layout shift is then counted from the whole shell on.
     */
    shellWhole?: boolean;
    /**
     * With `shellWhole`: the viewer's own holes, which every shell has (a
     * signed-in viewer's line); any other placeholder still means a section
     * was a hole in this load of the shell.
     */
    viewerHoles?: ReadonlyArray<string>;
    /** With `PLACEHOLDER_SHOTS=<dir>`: where the before/after screenshots go (`<name>-placeholder.png`, `<name>-final.png`). */
    shot?: string;
  }>,
): Promise<InstantParity> {
  if (options.shellText) {
    await waitForOwnShell(
      page,
      options.goto,
      options.shellText,
      options.baseURL,
      options.shellWhole,
      options.viewerHoles,
    );
  }
  await page.addInitScript(SHIFT_OBSERVER);
  let placeholders: Boxes = {};
  let before = 0;
  const deadline = Date.now() + 90_000;
  for (let incomplete = true; incomplete; ) {
    incomplete = false;
    await instant(
      page,
      async () => {
        await options.goto();
        await options.ready();
        // A prerendered page's own content is streamed after the route's
        // generic fallback in the same shell document and swapped in once
        // parsed: measure once the fallback is gone (its placeholders
        // satisfy `ready` too), not the fallback before it.
        if (options.shellText) {
          await page
            .locator('[data-placeholder="show"], [data-placeholder="person"]')
            .first()
            .waitFor({ state: 'detached', timeout: 4000 })
            .catch(() => undefined);
        }
        // the sections of a page are cached one by one: one can be a hole
        // in this load of the shell although the last one was whole
        if (
          options.shellWhole &&
          !(await shellIsWhole(page, options.viewerHoles))
        ) {
          // evidence for the report: which section was a hole this time
          const holes = await page.evaluate(() =>
            [...document.querySelectorAll('[data-placeholder]')]
              .filter((element) => element.getClientRects().length > 0)
              .map((element) => element.getAttribute('data-placeholder')),
          );
          console.log(`[shell] holes this load: ${holes.join(', ')}`);
          incomplete = true;
          return;
        }
        // Let fonts and the first paint settle before recording: two frames
        // first, so the fonts the text needs have been asked for (`ready` is
        // already resolved while none is loading)
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              ),
            ),
        );
        await page.evaluate(() => document.fonts.ready);
        placeholders = await readBoxes(page, 'data-placeholder');
        before = await documentHeight(page);
        if (options.shellWhole) {
          // Count only what moves while the holes fill. On a page's first
          // render its sections are holes for a moment inside the shell
          // and stream in before the check above (which then finds it
          // whole); their ghosts are sized for the usual person, not this
          // one, and that is not what these tests measure.
          await page.evaluate(() => {
            (window as unknown as { __shifts: unknown[] }).__shifts.length = 0;
          });
        }
        if (shotPath(options.shot, 'placeholder')) {
          await page.screenshot({
            fullPage: true,
            path: shotPath(options.shot, 'placeholder'),
          });
        }
      },
      options.baseURL ? { baseURL: options.baseURL } : undefined,
    );
    if (incomplete) {
      expect(Date.now(), 'the shell never came whole').toBeLessThan(deadline);
      await page.waitForTimeout(2000);
    }
  }
  await expect
    .poll(() => visiblePlaceholders(page), { timeout: 30_000 })
    .toBe(0);
  // Some pages keep a request open (images that never load on the rig):
  // wait for quiet, but not for ever.
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  // The footer is the last thing that can move: give a late shift a moment.
  await page.waitForTimeout(400);
  if (shotPath(options.shot, 'final')) {
    await page.screenshot({
      fullPage: true,
      path: shotPath(options.shot, 'final'),
    });
  }
  const slots = await readBoxes(page, 'data-slot');
  const { cls, shifts } = await readShifts(page);
  return {
    cls,
    documentHeight: { after: await documentHeight(page), before },
    placeholders,
    shifts,
    slots,
  };
}
