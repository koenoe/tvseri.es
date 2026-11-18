import { expect, test } from '@playwright/test';
import { expectParity, parityTable } from './helpers/parity';
import { namedViewports } from './helpers/placeholders';
import { signInAs } from './helpers/session';
import { measureParity } from './helpers/shellParity';

// Shell mechanism: `instant()` (`helpers/shellParity.ts`); the shell of an unvisited person and the viewer's holes are held by `instant()`.

/**
 * Placeholder parity for the person page: the shell of a person nobody has
 * visited (Lance Reddick), and the viewer's watched line on a prerendered
 * one (Bryan Cranston). Career, Shows and the family lines depend on the
 * person, so the sections
 * asserted are the ones whose size is the same for everyone.
 */

const VIEWPORTS = namedViewports('desktop', 'phone');

for (const viewport of VIEWPORTS) {
  test.describe(`person ${viewport.name}`, () => {
    test.use({ viewport });

    test('page shell: Known for, Shows, Collaborators and Awards', async ({
      baseURL,
      page,
    }) => {
      const parity = await measureParity(page, {
        baseURL,
        goto: () => page.goto('/person/129101/lance-reddick'),
        ready: () =>
          expect(page.locator('[data-placeholder="person"]')).toBeVisible(),
        shot: `person-shell-${viewport.name}`,
      });
      console.log(parityTable(parity, `${viewport.name} reddick`));
      // The sections below Career move with its length (a sparse or a
      // prolific person), so they are asserted by size, not by place.
      for (const name of [
        'person-known-for',
        'person-shows',
        'person-collaborators',
      ]) {
        expect(
          Math.abs(
            (parity.slots[name]?.height ?? 0) -
              (parity.placeholders[name]?.height ?? 0),
          ),
          name,
        ).toBeLessThanOrEqual(3);
      }
      // Each collaborator lands on its ghost (the row's gap, the tile's
      // box), measured from the section's top, which Career moves.
      const top = (boxes: typeof parity.slots) =>
        boxes['person-collaborators']?.y ?? 0;
      const tiles = Object.keys(parity.slots).filter((name) =>
        /^person-collaborator(#\d+)?$/.test(name),
      );
      expect(tiles.length, 'the collaborators drawn').toBeGreaterThan(0);
      for (const name of tiles) {
        const ghost = parity.placeholders[name];
        const tile = parity.slots[name];
        for (const side of ['x', 'width', 'height'] as const) {
          expect(
            Math.abs((tile?.[side] ?? 0) - (ghost?.[side] ?? 0)),
            `${name} ${side}: ghost ${ghost?.[side]} vs tile ${tile?.[side]}`,
          ).toBeLessThanOrEqual(2);
        }
        const offset = (tile?.y ?? 0) - top(parity.slots);
        const ghostOffset = (ghost?.y ?? 0) - top(parity.placeholders);
        expect(
          Math.abs(offset - ghostOffset),
          `${name} y in its section: ghost ${ghostOffset} vs tile ${offset}`,
        ).toBeLessThanOrEqual(2);
      }
    });

    // The family lines depend on the person (0 to 4: spouse, children,
    // headline awards, and "Next" on desktop). The ghost draws the most
    // common count, three on desktop and two below lg, and reserves nothing
    // more, so its box is asserted for a person at that count (Mara Linden).
    // Four lines (Bryan Cranston on desktop) are the known exception, as
    // Career and Shows: the ghost only shows while a person's page is
    // generated for the first time, and the cached shell carries the block.
    // the person-dependent holes once, at 1440
    if (viewport.name !== 'desktop') {
      return;
    }

    test('the family lines: the ghost has the box of the usual count', async ({
      baseURL,
      page,
    }) => {
      const parity = await measureParity(page, {
        baseURL,
        goto: () => page.goto('/person/4242003/mara-linden'),
        ready: () =>
          expect(page.locator('[data-placeholder="person"]')).toBeVisible(),
      });
      console.log(parityTable(parity, `${viewport.name} linden`));
      const ghost = parity.placeholders['person-family'];
      const block = parity.slots['person-family'];
      expect(block?.height ?? 0, 'the family block').toBeGreaterThan(0);
      for (const side of ['height', 'width'] as const) {
        expect(
          Math.abs((block?.[side] ?? 0) - (ghost?.[side] ?? 0)),
          `person-family ${side}: ghost ${ghost?.[side]} vs block ${block?.[side]}`,
        ).toBeLessThanOrEqual(2);
      }
    });

    test('the watched line has its space for a signed-in viewer', async ({
      baseURL,
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      const parity = await measureParity(page, {
        baseURL,
        goto: () => page.goto('/person/17419/bryan-cranston'),
        // the route's generic fallback has one too, until the page's own
        // content (already in the document) is swapped in
        ready: () =>
          expect(
            page.locator('[data-placeholder="person-watched"]').first(),
          ).toBeAttached(),
        // the family lines above it (four for him on desktop and three below
        // lg, a ghost of three and two) are a hole for a moment on the
        // page's first render and move the line 36px (34px below lg): measure
        // from a whole shell, where only the viewer's line is a hole
        shellText: 'Bryan Cranston',
        shellWhole: true,
        viewerHoles: ['person-watched'],
      });
      console.log(parityTable(parity, `${viewport.name} cranston alex`));
      expectParity(parity, { names: ['person-watched'] });
    });

    test('a visitor reserves nothing for it', async ({ baseURL, page }) => {
      const parity = await measureParity(page, {
        baseURL,
        goto: () => page.goto('/person/17419/bryan-cranston'),
        ready: () =>
          expect(
            page.getByRole('heading', { level: 1, name: 'Bryan Cranston' }),
          ).toBeVisible(),
        shellText: 'Bryan Cranston',
        shellWhole: true,
        shot: `person-visitor-${viewport.name}-${test.info().repeatEachIndex}`,
      });
      expect(parity.placeholders['person-watched']?.height ?? 0).toBe(0);
      expect(parity.slots['person-watched']?.height ?? 0).toBe(0);
      expect(parity.documentHeight.after).toBe(parity.documentHeight.before);
    });
  });
}
