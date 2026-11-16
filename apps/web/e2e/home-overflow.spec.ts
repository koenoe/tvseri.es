import { expect, type Page, test } from '@playwright/test';

import { findOverflow, formatProblems } from './helpers/overflow';
import { setLibraryHint, signInAs } from './helpers/session';

/**
 * Home holds its text from a small phone to the board's 1440
 * (`helpers/overflow.ts`): no sideways scroll, no text outside its card, no
 * value cut without an ellipsis, no control under something else. Signed out (the shared page) and signed in
 * (`kit`: Continue watching and the personal rows).
 *
 * The moments rotate by day, so the page is pinned to days that together
 * draw every kind (`/dev/home?day=`, served in this build only: it compiles
 * in Next's testing API), not today's two.
 */

const WIDTHS = [360, 390, 800, 1024, 1100, 1440] as const;

/** Versus's heading line (signed out and signed in) */
const VERSUS = /Which first\?$/;

/**
 * Mon 9 to Thu 12 Nov 2026: each feature once, each toy, If you liked X
 * twice; Sun 15: Versus signed in too (not an If you liked X day)
 */
const DAYS = [
  {
    day: '2026-11-09',
    feature: 'Binge calculator',
    signedIn: 'What’s on',
    signedOut: 'What’s on',
  },
  {
    day: '2026-11-10',
    feature: 'One season in stills',
    signedIn: /^If you liked /,
    signedOut: 'Where are they set?',
  },
  {
    day: '2026-11-11',
    feature: 'From the archive',
    signedIn: 'Connected by',
    signedOut: 'Connected by',
  },
  {
    day: '2026-11-12',
    feature: 'Did you know',
    signedIn: /^If you liked /,
    signedOut: VERSUS,
  },
  {
    day: '2026-11-15',
    feature: 'From the archive',
    signedIn: VERSUS,
    signedOut: VERSUS,
  },
] as const;

/**
 * Mon 4 to Thu 7 Jan 2027: every feature and toy again, and Sat 9 the
 * Countdown, with the longest real titles in place of the boards'
 * (`fixtures/home/longTitles.ts`;
 * "Open Avatar: The Last Airbender" once ran under Did you know's pager
 * at 800). Signed out: the toy is the shared one.
 */
const LONG_TITLE_DAYS = [
  {
    day: '2027-01-04',
    feature: 'Binge calculator',
    toy: 'Connected by',
  },
  { day: '2027-01-05', feature: 'One season in stills', toy: VERSUS },
  { day: '2027-01-06', feature: 'From the archive', toy: 'What’s on' },
  { day: '2027-01-07', feature: 'Did you know', toy: 'Where are they set?' },
  // the Countdown's day in the stub: three pills, the longest titles
  { day: '2027-01-09', feature: 'Next big premiere', toy: 'What’s on' },
] as const;

/** Every section has streamed in and the images are settled */
async function arrived(page: Page) {
  await expect(page.locator('[data-placeholder]:visible')).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

const heading = (page: Page, name: string | RegExp) =>
  page.getByRole('heading', { level: 2, name }).first();

for (const width of WIDTHS) {
  test.describe(`home overflow at ${width}px`, () => {
    test.use({ viewport: { height: width < 500 ? 844 : 900, width } });

    for (const { day, feature, signedIn, signedOut } of DAYS) {
      test(`${day} signed out`, async ({ page }) => {
        await page.goto(`/dev/home?day=${day}`);
        await expect(heading(page, feature)).toBeVisible();
        await expect(heading(page, signedOut)).toBeVisible();
        await arrived(page);
        const problems = await findOverflow(page);
        expect(problems, formatProblems(problems)).toEqual([]);
      });

      test(`${day} signed in`, async ({ context, page }) => {
        await signInAs(context, 'kit');
        await setLibraryHint(context, 'kit', [136315]);
        await page.goto(`/dev/home?day=${day}`);
        await expect(page.locator('[data-slot="continue"]')).toBeVisible();
        await expect(heading(page, feature)).toBeVisible();
        await expect(heading(page, signedIn)).toBeVisible();
        await arrived(page);
        const problems = await findOverflow(page);
        expect(problems, formatProblems(problems)).toEqual([]);
      });
    }

    // the heavy viewer (`marathonwatcher-2026`): long titles, a 1,048-episode
    // season in the tile, a 26-episode season in the lane row (the
    // tile and the row once set the page 429px wide on a phone)
    if (width < 500) {
      test('heavy viewer signed in', async ({ context, page }) => {
        await signInAs(context, 'marathonwatcher-2026');
        await page.goto(`/dev/home?day=${DAYS[0].day}`);
        await expect(page.locator('[data-slot="continue"]')).toBeVisible();
        await arrived(page);
        const problems = await findOverflow(page);
        expect(problems, formatProblems(problems)).toEqual([]);
      });
    }

    // Posters stay inside their card on a phone: the picker's fan is
    // clipped by its card (its outer posters run under the card's edges by
    // design) and If you liked's row stays in the card's padding (it was
    // cut by the card's rounded edge)
    if (width < 500) {
      test('posters stay inside their cards', async ({ context, page }) => {
        await signInAs(context, 'alex');
        await page.goto('/dev/home?day=2026-11-10');
        await expect(heading(page, /^If you liked /)).toBeVisible();
        await arrived(page);
        const outside = await page.evaluate(() => {
          const out: string[] = [];
          const inside = (
            name: string,
            box: DOMRect,
            card: Element,
            inset: number,
          ) => {
            const edge = card.getBoundingClientRect();
            if (
              box.left < edge.left + inset - 0.5 ||
              box.right > edge.right - inset + 0.5
            ) {
              out.push(
                `${name}: ${Math.round(box.left)}–${Math.round(box.right)} in ${Math.round(edge.left + inset)}–${Math.round(edge.right - inset)}`,
              );
            }
          };
          // the picker's fan runs under its card's edges on purpose, as a
          // hand of cards does: the card clips it and stays in the column
          const pick = document.querySelector('[data-slot="pick-one"]');
          const panel = pick?.firstElementChild;
          const fan = panel?.querySelector('.origin-top');
          if (!pick || !panel || !fan?.children.length) out.push('no pick fan');
          else {
            const clip = getComputedStyle(panel).overflowX;
            if (clip !== 'hidden' && clip !== 'clip') {
              out.push(`pick card does not clip its fan (${clip})`);
            }
            inside('pick card', panel.getBoundingClientRect(), pick, 0);
            const edge = panel.getBoundingClientRect();
            for (const poster of fan.children) {
              const box = poster.getBoundingClientRect();
              if (box.top < edge.top || box.bottom > edge.bottom) {
                out.push(
                  `pick poster: ${Math.round(box.top)}–${Math.round(box.bottom)} outside the card's ${Math.round(edge.top)}–${Math.round(edge.bottom)}`,
                );
              }
            }
          }
          // the card is the section its label names; the row follows its subline
          const card = document
            .getElementById('if-you-liked-label')
            ?.closest('section');
          const row = card?.querySelector('h3')?.nextElementSibling;
          if (!card || !row) out.push('no If you liked card');
          else
            inside('If you liked row', row.getBoundingClientRect(), card, 16);
          return out;
        });
        expect(outside).toEqual([]);
      });
    }

    // At 360 the 328px premiere ticket filled the column and the
    // next one no longer peeked: it reads as a rail at every phone width
    if (width < 500) {
      test('the next premiere ticket peeks', async ({ context, page }) => {
        await signInAs(context, 'alex');
        await page.goto('/');
        await arrived(page);
        const tickets = page.locator('#premieres-rail > li');
        await expect(tickets.nth(1)).toBeAttached();
        const second = await tickets.nth(1).boundingBox();
        expect(second?.x ?? width).toBeLessThanOrEqual(width - 12);
      });
    }
    test('the map’s place names stay on the map, off other pins', async ({
      page,
    }) => {
      await page.goto('/dev/home?day=2026-11-10');
      await expect(heading(page, 'Where are they set?')).toBeVisible();
      await arrived(page);
      const map = page.getByRole('group', {
        name: 'Map of where series are set',
      });
      const pins = map.getByRole('button');
      const count = await pins.count();
      expect(count).toBeGreaterThan(1);
      for (let index = 0; index < count; index += 1) {
        await pins.nth(index).click();
        const problems = await map.evaluate((element, picked) => {
          const out: string[] = [];
          const edge = element.getBoundingClientRect();
          const buttons = [...element.querySelectorAll('button')];
          // the labels' layer is the map's last child, one per pin
          const label = element.lastElementChild?.children[picked];
          if (!label) {
            return ['no label'];
          }
          const box = label.getBoundingClientRect();
          const name = label.textContent;
          if (box.left < edge.left - 0.5 || box.right > edge.right + 0.5) {
            out.push(`${name} leaves the map sideways`);
          }
          buttons.forEach((button, at) => {
            const dot = button.getBoundingClientRect();
            const x = dot.left + dot.width / 2;
            const y = dot.top + dot.height / 2;
            if (
              at !== picked &&
              x > box.left &&
              x < box.right &&
              y > box.top &&
              y < box.bottom
            ) {
              out.push(`${name} covers ${button.getAttribute('aria-label')}`);
            }
          });
          return out;
        }, index);
        expect(problems).toEqual([]);
      }
      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      expect(scrollWidth).toBeLessThanOrEqual(width);
    });

    // Where are they set?: the show's logo stands for its title when it has
    // one (Breaking Bad in the fixture), the title is written when it has
    // none (The Wire), and the live region says the title either way
    test('the picked show is drawn with its logo, else its title', async ({
      page,
    }) => {
      await page.goto('/dev/home?day=2026-11-10');
      await arrived(page);
      const card = page.getByRole('region', { name: 'Where are they set?' });
      const live = card.locator('[aria-live="polite"]');
      await expect(live).toHaveText('The Wire');
      await expect(
        card.getByText('The Wire', { exact: true }).first(),
      ).toBeAttached();
      await card.getByRole('button', { name: /^Albuquerque/ }).click();
      await expect(live).toHaveText('Breaking Bad');
      const logo = card.locator('img[alt="Breaking Bad"]');
      await expect(logo).toBeAttached();
      await expect
        .poll(() =>
          logo.evaluate(
            (element) =>
              getComputedStyle(
                element.closest('[aria-hidden="true"]') ?? element,
              ).opacity,
          ),
        )
        .toBe('1');
      // the logo stays inside the image, 14px from its sides
      const box = await logo.boundingBox();
      const frame = await logo.locator('xpath=ancestor::div[1]').boundingBox();
      expect(box && frame).toBeTruthy();
      if (box && frame) {
        expect(box.x).toBeGreaterThanOrEqual(frame.x + 13);
        expect(box.x + box.width).toBeLessThanOrEqual(
          frame.x + frame.width - 13,
        );
        expect(box.y + box.height).toBeLessThanOrEqual(frame.y + frame.height);
      }
    });

    // the preview page itself, where every block and its placeholder sit
    // one under the other (the Binge and Where are they set? placeholders'
    // buttons once didn't shrink, 56px past a 360 screen)
    test('/dev/home itself', async ({ page }) => {
      await page.goto('/dev/home');
      await expect(page.locator('#toy-ghost-versus')).toBeAttached();
      await page.waitForLoadState('networkidle');
      const wider = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(wider).toBe(0);
    });

    // One season in stills on the long-title day: a long series title and
    // twelve stills, the most the API sends. The headline wraps inside the
    // card, "Open {series}" truncates instead of pushing it, the twelve
    // stills stay in the card's column, and from lg they end level with the
    // season picture
    test('One season in stills holds a long title and twelve stills', async ({
      page,
    }) => {
      await page.goto('/dev/home?day=2027-01-05');
      await expect(heading(page, 'One season in stills')).toBeVisible();
      await arrived(page);
      const problems = await page
        .locator('#stills-label')
        .evaluate((label, viewport) => {
          const out: string[] = [];
          const card = label.parentElement;
          if (!card) {
            return ['no card'];
          }
          const style = getComputedStyle(card);
          const edge = card.getBoundingClientRect();
          const left = edge.left + Number.parseFloat(style.paddingLeft);
          const right = edge.right - Number.parseFloat(style.paddingRight);
          const [, headline, open, content] = [...card.children];
          const picture = content?.children[0];
          const grid = content?.children[1];
          if (!headline || !open || !picture || !grid) {
            return ['the card is missing a part'];
          }
          const inside = (name: string, element: Element) => {
            const box = element.getBoundingClientRect();
            if (box.left < left - 0.5 || box.right > right + 0.5) {
              out.push(
                `${name}: ${Math.round(box.left)}–${Math.round(box.right)} outside ${Math.round(left)}–${Math.round(right)}`,
              );
            }
          };
          if ((headline.textContent ?? '').length < 50) {
            out.push(`not the long title: ${headline.textContent}`);
          }
          inside('headline', headline);
          if (headline.scrollWidth > headline.clientWidth + 0.5) {
            out.push('the headline runs past its box');
          }
          inside('Open', open);
          const name = open.querySelector('span');
          if (
            name &&
            name.scrollWidth > name.clientWidth + 0.5 &&
            getComputedStyle(name).textOverflow !== 'ellipsis'
          ) {
            out.push('Open is cut without an ellipsis');
          }
          const stills = [...grid.children];
          if (stills.length !== 12) {
            out.push(`${stills.length} stills, not 12`);
          }
          stills.forEach((still, at) => {
            inside(`still ${at + 1}`, still);
          });
          const text = headline.getBoundingClientRect();
          const pill = open.getBoundingClientRect();
          const below = content.getBoundingClientRect();
          if (viewport >= 768 && text.right > pill.left - 23.5) {
            out.push('the headline runs into Open');
          }
          if (viewport < 768 && pill.top < below.bottom + 23.5) {
            out.push('Open is not under the stills');
          }
          if (viewport >= 1024) {
            const level =
              grid.getBoundingClientRect().bottom -
              picture.getBoundingClientRect().bottom;
            if (Math.abs(level) > 0.5) {
              out.push(`the stills end ${level}px off the picture's foot`);
            }
          }
          return out;
        }, width);
      expect(problems).toEqual([]);
    });

    for (const { day, feature, toy } of LONG_TITLE_DAYS) {
      test(`${day} long titles`, async ({ page }) => {
        await page.goto(`/dev/home?day=${day}`);
        await expect(heading(page, feature)).toBeVisible();
        await expect(heading(page, toy)).toBeVisible();
        await arrived(page);
        const problems = await findOverflow(page);
        expect(problems, formatProblems(problems)).toEqual([]);
      });
    }
  });
}
