import { expect, type Page, test } from '@playwright/test';

import { nextFrames } from './helpers/viewport';

/**
 * Discover's "Streaming in …" line (first in its meta row,
 * then "Updated"). The page is static for everyone; the line is the
 * viewer's. From the second visit on the pre-paint hint draws it before the
 * first paint (`lib/region/regionHint`), so nothing in the row moves; on a
 * first visit the slot reserves the browser language's country.
 *
 * Every frame from the first paint, an init script records where "Updated"
 * starts and what the region slot shows.
 */

const KEY = 'tvseries:region';

type Frame = Readonly<{
  line: string;
  /** what is drawn in the region slot: the placeholder bar or the line (icon to text end) */
  regionWidth: number;
  regionX: number;
  titleX: number;
  updatedX: number;
}>;

async function recordFrames(page: Page) {
  await page.addInitScript(() => {
    const frames: {
      line: string;
      regionWidth: number;
      regionX: number;
      titleX: number;
      updatedX: number;
    }[] = [];
    (window as unknown as { __frames: typeof frames }).__frames = frames;
    const frame = () => {
      const row = document.querySelector('#discover-title ~ div');
      const items = row ? [...row.children] : [];
      const updated = items.find((item) =>
        item.textContent?.includes('Updated'),
      );
      if (updated) {
        const first = items[0];
        const after = first?.querySelector('[aria-hidden="true"].inline-block');
        const pseudo = after
          ? getComputedStyle(after, '::after').content.replace(/^"|"$/g, '')
          : '';
        const line = first?.textContent?.replace(/^, /, '').trim() || pseudo;
        const region = first?.getBoundingClientRect();
        const title = document.querySelector('#discover-title');
        const entry = {
          line,
          regionWidth: Math.round(region?.width ?? 0),
          regionX: Math.round(region?.left ?? 0),
          titleX: Math.round(title?.getBoundingClientRect().left ?? 0),
          updatedX: Math.round(updated.getBoundingClientRect().left),
        };
        const last = frames.at(-1);
        if (
          !last ||
          last.line !== entry.line ||
          last.regionX !== entry.regionX ||
          last.regionWidth !== entry.regionWidth ||
          last.updatedX !== entry.updatedX
        ) {
          frames.push(entry);
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

const framesOf = (page: Page) =>
  page.evaluate(() => (window as unknown as { __frames: Frame[] }).__frames);

const regionCalls = (page: Page) => {
  const calls: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/region') {
      calls.push(request.url());
    }
  });
  return calls;
};

test.use({ viewport: { height: 900, width: 1440 } });

test('a stored region is drawn at first paint: nothing moves, no request', async ({
  page,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({ r: 'NL', t: Date.now(), u: '', v: 1 }),
    );
  }, KEY);
  await recordFrames(page);
  const calls = regionCalls(page);
  await page.goto('/discover');
  const line = page.getByText('Streaming in the Netherlands', { exact: true });
  await expect(line).toBeVisible();
  // a few frames after React's own line replaced the hint
  await nextFrames(page, 30);
  const frames = await framesOf(page);
  expect(new Set(frames.map((frame) => frame.updatedX)).size).toBe(1);
  expect(frames[0]?.line).toBe('Streaming in the Netherlands');
  expect(calls).toEqual([]);
});

test('with no stored region the slot reserves a line, then asks once and keeps it', async ({
  page,
}) => {
  await recordFrames(page);
  const calls = regionCalls(page);
  await page.goto('/discover');
  // the stub's server has no geo header: the default region
  await expect(
    page.getByText('Streaming in the United States', { exact: true }),
  ).toBeVisible();
  const frames = await framesOf(page);
  // the browser's language is en-US, so the reserved width was right
  expect(new Set(frames.map((frame) => frame.updatedX)).size).toBe(1);
  // the placeholder bar covers the item from the icon's left edge, the
  // title's, like the line that replaces it, within 2px
  const first = frames[0];
  const settled = frames.at(-1);
  expect(first?.line).toBe('Streaming in the United States');
  for (const frame of frames) {
    expect(Math.abs(frame.regionX - frame.titleX)).toBeLessThanOrEqual(2);
    expect(
      Math.abs(frame.regionWidth - (settled?.regionWidth ?? 0)),
    ).toBeLessThanOrEqual(2);
  }
  expect(calls).toHaveLength(1);
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
    KEY,
  );
  expect(stored).toMatchObject({ r: 'US', u: '', v: 1 });

  // The next document draws it before React and asks nothing
  await page.reload();
  await expect(
    page.getByText('Streaming in the United States', { exact: true }),
  ).toBeVisible();
  expect(calls).toHaveLength(1);
});
