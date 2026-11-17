import { expect, test } from '@playwright/test';
import { expectParity, parityTable, TOLERANCE } from './helpers/parity';
import { ALL_VIEWPORTS } from './helpers/placeholders';
import { routeTrendingLogos } from './helpers/png';
import { setLibraryHint, signInAs } from './helpers/session';
import { measureParity } from './helpers/shellParity';

// Shell mechanism: `instant()` (`helpers/shellParity.ts`); the shell is the prerendered page `instant()` holds, with the viewer's pre-paint hint applied.

/**
 * Placeholder parity for Home's viewer holes (`helpers/shellParity.ts`). The
 * shared sections (the spotlight, the rows, the day's moments) are
 * `use cache` content prerendered into the shell, so what streams in per
 * viewer is Continue watching or, for a new viewer, Get started. The
 * pre-paint script says which (`data-home`, `htmlHints.ts`), so the shell
 * shows the right size before the first paint.
 *
 * The shared sections' own placeholders (Premieres, Today's feature and toy
 * by the day's kind, the rows' caption lines, Go deeper, Weekend…) only show
 * when the API cannot answer in time: they are measured against the loaded
 * sections on a dev server with a slow stub API.
 */

const VIEWPORTS = ALL_VIEWPORTS;

for (const viewport of VIEWPORTS) {
  test.describe(`home ${viewport.name}`, () => {
    test.use({ viewport });

    test('Continue watching, a member (alex)', async ({
      baseURL,
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      await setLibraryHint(context, 'alex', [136315]);
      await routeTrendingLogos(context);
      const parity = await measureParity(page, {
        baseURL,
        goto: () => page.goto('/'),
        ready: () =>
          expect(page.locator('[data-placeholder="continue"]')).toBeVisible(),
        shot: `home-continue-${viewport.name}`,
      });
      console.log(parityTable(parity, `home continue ${viewport.name}`));
      // the section, and inside it the Up next card (the shared card's own
      // ghost, `components/up-next`) and the In progress lane (built from
      // the same layout, `continueLayout.ts`): the ghosts are where the
      // content lands
      expectParity(parity, {
        names: ['continue', 'up-next-card', 'continue-lane'],
      });
    });

    test('Get started, a new viewer (empty library hint)', async ({
      baseURL,
      context,
      page,
    }) => {
      await signInAs(context, 'nina');
      await setLibraryHint(context, 'nina', []);
      await routeTrendingLogos(context);
      const parity = await measureParity(page, {
        baseURL,
        goto: () => page.goto('/'),
        ready: () =>
          expect(
            page.locator('[data-placeholder="get-started"]'),
          ).toBeVisible(),
        shot: `home-get-started-${viewport.name}`,
      });
      console.log(parityTable(parity, `home get started ${viewport.name}`));
      expectParity(parity, { names: ['get-started'] });
    });

    test("Today's feature: the placeholder has the loaded card's boxes", async ({
      page,
    }) => {
      await page.goto('/dev/home');
      // visible, not attached: the preview streams in (a Suspense hole after
      // `connection()`) and waits in a hidden template until React swaps it
      // in; measured there every box is 0
      await expect(page.locator('#feature-ghost-countdown')).toBeVisible();
      for (const kind of FEATURE_KINDS) {
        const boxes = await page.evaluate(featureBoxes, kind);
        console.log(`${kind} ${viewport.name}`, JSON.stringify(boxes));
        expect(boxes.loaded.frame.height).toBeGreaterThan(0);
        for (const part of Object.keys(boxes.loaded) as FeaturePart[]) {
          for (const side of ['x', 'y', 'width', 'height'] as const) {
            expect(
              Math.abs(boxes.loaded[part][side] - boxes.ghost[part][side]),
              `${kind} ${part} ${side}`,
            ).toBeLessThanOrEqual(TOLERANCE);
          }
        }
      }
    });

    test("Today's toy: each kind's placeholder has the loaded toy's boxes", async ({
      page,
    }) => {
      await page.goto('/dev/home');
      // visible, not attached: see the feature test above
      await expect(page.locator('#toy-ghost-connected-by')).toBeVisible();
      // every frame is there first: What's on's comes from its island
      for (const kind of TOY_KINDS) {
        await expect(
          page.locator(`#toy-${kind} [data-slot^="toy"]`).first(),
        ).toBeVisible();
        await expect(
          page.locator(`#toy-ghost-${kind} [data-placeholder^="toy"]`).first(),
        ).toBeAttached();
      }
      for (const kind of TOY_KINDS) {
        const boxes = await page.evaluate(toyBoxes, kind);
        console.log(`${kind} ${viewport.name}`, JSON.stringify(boxes));
        expect(boxes.loaded.frame.height).toBeGreaterThan(0);
        for (const part of Object.keys(boxes.loaded) as ToyPart[]) {
          const loaded = boxes.loaded[part];
          const ghost = boxes.ghost[part];
          for (const side of ['x', 'y', 'width', 'height'] as const) {
            expect(
              Math.abs(loaded[side] - ghost[side]),
              `${kind} ${part} ${side}`,
            ).toBeLessThanOrEqual(TOLERANCE);
          }
        }
      }
    });
  });
}

/** The toys, and the signed-in card that takes the slot on If you liked days */
const TOY_KINDS = [
  'whats-on',
  'where-set',
  'connected-by',
  'versus',
  'if-you-liked',
] as const;

/** The features whose placeholder `/dev/home` draws beside the loaded card */
const FEATURE_KINDS = [
  'binge',
  'stills',
  'archive',
  'did-you-know',
  'countdown',
] as const;

type FeaturePart =
  | 'frame'
  | 'heading'
  | 'headline'
  | 'open'
  | 'picture'
  | 'stills';

/**
 * Runs in the page (serialised): the feature's frame and its heading (its
 * label, `MomentLabel`), relative to the frame,
 * loaded (`#feature-<kind>`) and placeholder (`#feature-ghost-<kind>`).
 * For One season in stills also the card's other parts (its grid: the
 * headline, "Open {series}", then the season picture and the stills).
 */
const featureBoxes = (kind: string) => {
  const read = (root: string) => {
    const frame = document.querySelector(
      `#${root} [data-slot="feature"], #${root} [data-placeholder="feature"]`,
    );
    const zero = { height: 0, width: 0, x: 0, y: 0 };
    if (!frame) {
      return { frame: zero, heading: zero };
    }
    const origin = frame.getBoundingClientRect();
    const box = (element: Element | null) => {
      if (!element) {
        return zero;
      }
      const rect = element.getBoundingClientRect();
      return {
        height: Math.round(rect.height),
        width: Math.round(rect.width),
        x: Math.round(rect.x - origin.x),
        y: Math.round(rect.y - origin.y),
      };
    };
    const heading = frame.querySelector('h2');
    const parts: Record<string, ReturnType<typeof box>> = {
      frame: { ...box(frame), x: 0, y: 0 },
      heading: box(heading),
    };
    if (kind === 'stills') {
      const card = heading?.parentElement;
      const content = card?.children[3];
      parts.headline = box(card?.children[1] ?? null);
      parts.open = box(card?.children[2] ?? null);
      parts.picture = box(content?.children[0] ?? null);
      parts.stills = box(content?.children[1] ?? null);
    }
    return parts;
  };
  return {
    ghost: read(`feature-ghost-${kind}`),
    loaded: read(`feature-${kind}`),
  } as Record<
    'ghost' | 'loaded',
    Record<FeaturePart, { height: number; width: number; x: number; y: number }>
  >;
};

type ToyPart = 'frame' | 'heading' | 'screen' | 'remote' | 'another';

/**
 * Runs in the page (serialised): the toy's frame (If you liked X's is
 * `toy-if-you-liked`) and, inside it, its heading (and for What's on the screen and the remote, the label row's
 * parent and its sibling; for Connected by Another path on screen), relative to the frame, for the loaded toy
 * (`#toy-<kind>`) and its placeholder (`#toy-ghost-<kind>`) on `/dev/home`.
 */
const toyBoxes = (kind: string) => {
  const read = (root: string) => {
    const frame = document.querySelector(
      `#${root} [data-slot^="toy"], #${root} [data-placeholder^="toy"]`,
    );
    const zero = { height: 0, width: 0, x: 0, y: 0 };
    if (!frame) {
      return { frame: zero };
    }
    const origin = frame.getBoundingClientRect();
    const box = (element: Element | null | undefined) => {
      if (!element) {
        return zero;
      }
      const rect = element.getBoundingClientRect();
      return {
        height: Math.round(rect.height),
        width: Math.round(rect.width),
        x: Math.round(rect.x - origin.x),
        y: Math.round(rect.y - origin.y),
      };
    };
    const heading = frame.querySelector('h2');
    const parts: Record<string, ReturnType<typeof box>> = {
      frame: { ...box(frame), x: 0, y: 0 },
      heading: box(heading),
    };
    if (kind === 'whats-on') {
      const remote = heading?.parentElement?.parentElement;
      parts.remote = box(remote);
      parts.screen = box(remote?.previousElementSibling);
    }
    if (kind === 'connected-by') {
      // the pill on screen (a button, or its flat face)
      parts.another = box(
        [...frame.querySelectorAll('button, span')].find(
          (element) =>
            element.textContent?.trim() === 'Another path' &&
            String(element.className).includes('rounded-full') &&
            element.getBoundingClientRect().width > 0,
        ),
      );
    }
    return parts;
  };
  return {
    ghost: read(`toy-ghost-${kind}`),
    loaded: read(`toy-${kind}`),
  } as {
    ghost: Record<
      ToyPart,
      { height: number; width: number; x: number; y: number }
    >;
    loaded: Record<
      ToyPart,
      { height: number; width: number; x: number; y: number }
    >;
  };
};
