import { expect, type Page, test } from '@playwright/test';

import { type StubViewer, signInAs } from './helpers/session';
import { untilStable } from './helpers/viewport';

/**
 * The air above the footer's band ("content now sits against
 * footer block"): every page kind ends the same distance above the band,
 * the footer's own air (`[data-footer-air]`: 64px at 768 and up, 48px on a
 * phone), never doubled by a page's own bottom padding. A page that ends in
 * a full-width band (a series) has none: its band meets the footer's. One
 * page per kind, at a phone and a desktop.
 */

const airHeight = (page: Page) =>
  page
    .locator('[data-footer-air]')
    .evaluate((air) => air.getBoundingClientRect().height);

const PAGES: ReadonlyArray<
  Readonly<{
    /** the page's own distance, when it isn't the footer's air */
    gap?: number;
    name: string;
    path: string;
    viewer?: StubViewer;
  }>
> = [
  { name: 'Home', path: '/' },
  { name: 'a genre', path: '/genre/crime' },
  // its last block is a full-width band that joins the footer's band
  { gap: 0, name: 'a series', path: '/136315/the-bear' },
  // signed-in pages last: the session stays for the rest of the test
  { name: 'a profile', path: '/u/alex', viewer: 'alex' },
  { name: 'Settings', path: '/settings/profile', viewer: 'alex' },
];

/**
 * The band's top minus the bottom of the page's last content box: every
 * visible box in flow before the footer (absolute and fixed layers, such as
 * backdrops and the toast, are not content).
 */
const gapAbove = (page: Page) =>
  page.evaluate(() => {
    const footer = document.querySelector('[data-site-footer]');
    if (!footer) {
      return null;
    }
    const band = footer.getBoundingClientRect().top;
    let last = Number.NEGATIVE_INFINITY;
    let lastName = '';
    const walk = (node: Element) => {
      if (
        node === footer ||
        node.closest('header,[data-toast-host],[data-footer-air]')
      ) {
        return;
      }
      const style = getComputedStyle(node);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.position === 'absolute' ||
        style.position === 'fixed'
      ) {
        return;
      }
      // a sticky nav follows the scroll: not where the page ends
      if (style.position === 'sticky') {
        return;
      }
      const box = node.getBoundingClientRect();
      // content: a leaf (text, an image, an icon, a control, a paragraph), a card's box
      const leaf =
        node.children.length === 0 ||
        [
          'svg',
          'img',
          'picture',
          'video',
          'canvas',
          'button',
          'input',
          // a line of text is its paragraph's box, not the shorter inline
          // box of a link that happens to end it
          'p',
          'li',
        ].includes(node.tagName.toLowerCase());
      // a box that draws (a card, a tile), not a full-bleed ground
      const card =
        (style.boxShadow !== 'none' ||
          style.backgroundColor !== 'rgba(0, 0, 0, 0)') &&
        box.width < document.documentElement.clientWidth - 1 &&
        node.tagName !== 'MAIN';
      // a full-bleed band drawn by a pseudo-element (the show page's
      // darkened Storyline band) ends where it ends
      const after = getComputedStyle(node, '::after');
      const band =
        after.content !== 'none' &&
        after.position === 'absolute' &&
        after.backgroundColor !== 'rgba(0, 0, 0, 0)';
      if (
        (leaf || card || band) &&
        box.height > 0 &&
        box.width > 0 &&
        box.bottom > last
      ) {
        last = box.bottom;
        lastName = `${node.tagName.toLowerCase()}.${String(node.className).slice(0, 60)} ${(node.textContent ?? '').slice(0, 30)}`;
      }
      if (leaf) {
        return;
      }
      for (const child of node.children) {
        walk(child);
      }
    };
    const shell = footer.parentElement;
    for (const child of shell?.children ?? []) {
      if (
        child.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING
      ) {
        walk(child);
      }
    }
    return { gap: Math.round(band - last), last: lastName };
  });

/** Loaded, every lazy and on-scroll section in, and nothing moving */
const settle = async (page: Page) => {
  await page.waitForLoadState('load');
  await expect(page.locator('[data-placeholder]')).toHaveCount(0, {
    timeout: 15_000,
  });
  // sections that reveal on scroll are in, and nothing lazy is left
  await untilStable(
    async () => {
      await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight),
      );
      return page.evaluate(() => document.documentElement.scrollHeight);
    },
    { message: 'the page stops growing', quietMs: 400 },
  );
  await expect(page.locator('[data-placeholder]')).toHaveCount(0);
  await untilStable(() => gapAbove(page), {
    message: 'the gap above the footer settles',
  });
};

for (const width of [1440, 390] as const) {
  test(`every page kind ends the footer’s air above the footer (${width})`, async ({
    context,
    page,
  }) => {
    // short, so no page is shorter than the window (its main would grow)
    await page.setViewportSize({ height: 500, width });
    for (const entry of PAGES) {
      if (entry.viewer) {
        await signInAs(context, entry.viewer);
      }
      await page.goto(entry.path);
      await settle(page);
      const air = Math.round(await airHeight(page));
      expect(air, `${entry.name}: the footer has its air`).toBeGreaterThan(0);
      const measured = await gapAbove(page);
      expect(measured?.gap, `${entry.name}: ${measured?.last}`).toBe(
        entry.gap ?? air,
      );
    }
  });
}
