import { type Browser, expect } from '@playwright/test';

import {
  type Box,
  type Boxes,
  NONE,
  type Parity,
  readShifts,
  SHIFT_OBSERVER,
} from './parity';
import { type StubViewer, signInAs } from './session';
import { fontsSettled, phoneScrollbars, untilStable } from './viewport';

/**
 * Placeholder parity: a Suspense fallback must occupy the box of what
 * replaces it. A fallback carries `data-placeholder="<name>"`, the content
 * `data-slot="<name>"` (the only markup added for testing). The shell is
 * captured with JavaScript off (every fallback on screen, every resolved part
 * waiting hidden), the content with JavaScript on once it has arrived, and
 * the boxes are compared in document coordinates.
 */

export const VIEWPORTS = {
  desktop: { height: 900, width: 1440 },
  laptop: { height: 900, width: 1100 },
  phone: { height: 844, width: 390 },
  // md to lg (768-1023) and the first width past lg: where the layouts switch
  tablet: { height: 1000, width: 800 },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;

/**
 * `VIEWPORTS` as a list in the given order, each with its name (test titles
 * read it): `for (const viewport of namedViewports('desktop', 'phone'))`.
 */
export const namedViewports = (...names: ReadonlyArray<ViewportName>) =>
  names.map((name) => ({ name, ...VIEWPORTS[name] }));

/** What the pre-paint script does on a hard load: someone else's profile shows the visitor placeholders */
const VISITOR_RULE =
  '.ph-owner{display:none!important}.ph-visitor{display:contents!important}';

/**
 * Runs in the page (serialised): the boxes of the named placeholders or
 * slots (the same `Box` as `readBoxes`, by name). Both variants of a
 * placeholder carry the name: the shown one has a box.
 */
const rects = ([attribute, names]: readonly [
  'placeholder' | 'slot',
  string[],
]) =>
  Object.fromEntries(
    names.map((name) => {
      const box = [
        ...document.querySelectorAll(`[data-${attribute}="${name}"]`),
      ]
        .map((element) => element.getBoundingClientRect())
        .find((candidate) => candidate.height > 0);
      if (!box) {
        return [name, null];
      }
      return [
        name,
        {
          height: Math.round(box.height),
          width: Math.round(box.width),
          x: Math.round(box.x + scrollX),
          y: Math.round(box.y + scrollY),
        },
      ];
    }),
  );

const orNone = (boxes: Record<string, Box | null>): Boxes =>
  Object.fromEntries(
    Object.entries(boxes).map(([name, box]) => [name, box ?? NONE]),
  );

/**
 * Loads a page twice: with JavaScript off (the shell: every fallback on
 * screen, every resolved part waiting hidden), recording the placeholders,
 * and with JavaScript on once the content has arrived, recording the slots
 * and the layout shift. Both are read once their fonts are in and their
 * boxes have stopped moving (a box read in the fallback font can wrap a line
 * the real one does not). Phone viewports render with a phone's overlay
 * scrollbar (`phoneScrollbars`). Returns a `Parity` for
 * `expectParity`/`parityTable` (`helpers/parity.ts`).
 */
export async function measureNoScriptParity(
  browser: Browser,
  options: Readonly<{
    names: ReadonlyArray<string>;
    path: string;
    viewer: StubViewer;
    /** A named viewport, or any size (a width where a line wraps) */
    viewport: ViewportName | Readonly<{ height: number; width: number }>;
    /** Placeholder name to content name, where they differ */
    slotNames?: Readonly<Record<string, string>>;
    /** Someone else's profile: apply what the pre-paint script would */
    visitor?: boolean;
  }>,
): Promise<Parity> {
  const viewport =
    typeof options.viewport === 'string'
      ? VIEWPORTS[options.viewport]
      : options.viewport;
  const names = [...options.names];
  const slotNames = names.map((name) => options.slotNames?.[name] ?? name);

  const shellContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport,
  });
  await phoneScrollbars(shellContext, viewport.width);
  await signInAs(shellContext, options.viewer);
  const shell = await shellContext.newPage();
  await shell.goto(options.path);
  if (options.visitor) {
    await shell.evaluate((css) => {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.append(style);
    }, VISITOR_RULE);
  }
  await fontsSettled(shell);
  const readPlaceholders = () =>
    shell.evaluate(rects, ['placeholder', names] as const);
  await untilStable(readPlaceholders, {
    message: 'the placeholders kept moving',
  });
  const placeholders = await readPlaceholders();
  await shellContext.close();

  const context = await browser.newContext({ viewport });
  await phoneScrollbars(context, viewport.width);
  await signInAs(context, options.viewer);
  const page = await context.newPage();
  // later pages of an endless list are not the first render
  await page.route('**/api/u/**', (route) =>
    route.fulfill({ json: { items: [], nextCursor: null } }),
  );
  await page.addInitScript(SHIFT_OBSERVER);
  await page.goto(options.path);
  for (const slot of slotNames) {
    // a repeated slot (a grid's tiles) is measured by its first
    await expect(page.locator(`[data-slot="${slot}"]`).first()).toBeVisible();
  }
  await page.waitForLoadState('networkidle');
  await fontsSettled(page);
  const readSlots = () => page.evaluate(rects, ['slot', slotNames] as const);
  await untilStable(readSlots, { message: 'the content kept moving' });
  const slots = await readSlots();
  const { cls, shifts } = await readShifts(page);
  await context.close();

  return {
    cls,
    placeholders: orNone(placeholders),
    shifts,
    slots: orNone(
      Object.fromEntries(
        names.map((name, index) => [
          name,
          slots[slotNames[index] ?? name] ?? null,
        ]),
      ),
    ),
  };
}
