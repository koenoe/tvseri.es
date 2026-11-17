import { expect, test } from '@playwright/test';
import { expectParity, parityTable } from './helpers/parity';
import { namedViewports } from './helpers/placeholders';
import { measureParity } from './helpers/shellParity';

// Shell mechanism: `instant()` (`helpers/shellParity.ts`); a landing nobody has visited has its whole body as one fallback, which `instant()` holds.

/**
 * Placeholder parity for the Discover landings (`helpers/shellParity.ts`).
 * The sample slugs prerender, so each landing is loaded with a slug nobody
 * has visited: its shell is the whole page's placeholder, every section in
 * order at its real size (the audit measured one row where the page has
 * many), and the content that replaces it must land in the same boxes with
 * nothing shifting.
 *
 * `landing-hero` is the hero (genre, theme, network), `landing-rows` the
 * sections below it as a whole (so the page keeps its length and the footer
 * does not move), the others are single sections.
 */

const VIEWPORTS = namedViewports('desktop', 'phone');

/** On a phone: a genre's hero and a network's logo hero */
const PHONE = new Set(['/genre/drama', '/network/netflix']);

/**
 * `position`: sections whose place and width are compared but not their
 * height, because the stub holds fewer shows than a real landing (a row
 * Country drops under three new shows; Korean has five wall cards, not
 * eight). The skeleton is sized for the real count (the audit's real data).
 * Time travel's stub has no night pick, so its Where to start has two cards
 * and is left out (a block needs three posters): a slug's very
 * first visit draws the section's skeleton, then the rows move up.
 */
/**
 * `inner`: blocks inside a section whose ghost is built from the loaded
 * block's own layout (skeletons match the eventual content as closely as
 * possible): their place and width are compared, not the
 * height, which follows the text (a reason on one line or two).
 */
const LANDINGS = [
  {
    inner: ['start-text'],
    names: ['landing-hero', 'landing-rows', 'start', 'ranked'],
    path: '/genre/drama',
  },
  {
    names: ['landing-hero'],
    path: '/theme/time-travel',
    position: ['landing-rows'],
  },
  { names: ['landing-hero', 'landing-rows'], path: '/network/netflix' },
  { names: ['start'], path: '/country/jp', position: ['landing-rows'] },
  { inner: ['decade-card'], names: ['landing-rows'], path: '/decade/2000s' },
  {
    inner: ['wall-card'],
    names: [],
    path: '/language/ko',
    position: ['landing-rows', 'wall'],
  },
] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`landings ${viewport.name}`, () => {
    test.use({ viewport });

    for (const landing of LANDINGS) {
      if (viewport.name === 'phone' && !PHONE.has(landing.path)) continue;
      test(landing.path, async ({ baseURL, page }) => {
        const parity = await measureParity(page, {
          baseURL,
          goto: () => page.goto(landing.path),
          ready: () =>
            expect(
              page.locator('[data-placeholder="landing-rows"]'),
            ).toBeVisible(),
          shot: `landing${landing.path.replaceAll('/', '-')}-${viewport.name}`,
        });
        console.log(parityTable(parity, `${landing.path} ${viewport.name}`));
        const position = [
          ...('position' in landing ? landing.position : []),
          ...('inner' in landing ? landing.inner : []),
        ];
        if (landing.names.length > 0) {
          expectParity(parity, { ignoreShift: true, names: landing.names });
        }
        for (const name of position) {
          const placeholder = parity.placeholders[name];
          const slot = parity.slots[name];
          expect(placeholder, `placeholder ${name}`).toBeDefined();
          for (const key of ['x', 'y', 'width'] as const) {
            expect(
              Math.abs((slot?.[key] ?? 0) - (placeholder?.[key] ?? 0)),
              `${name} ${key}`,
            ).toBeLessThanOrEqual(2);
          }
        }
        // the ghost title sits in the title's line box, shorter than it and
        // centred, so it keeps the distance the glyphs have from the crumb
        const title = parity.placeholders['landing-title'];
        const bar = parity.placeholders['landing-title-bar'];
        const heading = parity.slots['landing-title'];
        if (
          landing.path === '/genre/drama' ||
          landing.path === '/theme/time-travel'
        ) {
          expect(bar, 'the ghost title has its line box and bar').toBeDefined();
        }
        if (title && bar && heading) {
          // beside a tile (theme) the hero is bottom-aligned to a tile that
          // differs in height from lg, so only the title-led hero compares y
          const keys =
            landing.path === '/genre/drama'
              ? ['x', 'y', 'height']
              : ['x', 'height'];
          for (const key of keys as ReadonlyArray<'x' | 'y' | 'height'>) {
            expect(
              Math.abs(heading[key] - title[key]),
              `landing-title ${key}`,
            ).toBeLessThanOrEqual(2);
          }
          console.log(
            `${landing.path} ${viewport.name}: crumb to bar ${bar.y - title.y}px (line box ${title.height}px, bar ${bar.height}px)`,
          );
          expect(bar.height, 'bar is shorter than the line box').toBeLessThan(
            title.height * 0.8,
          );
          expect(bar.y - title.y, 'gap above the bar').toBeGreaterThanOrEqual(
            6,
          );
        }
        // the load shifted nothing (the page below a section whose count differs only moves with it)
        if (!('position' in landing)) {
          expect(parity.cls, 'layout shift').toBeLessThan(0.01);
        }
      });
    }
  });
}
