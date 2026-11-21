import {
  expect,
  type Page,
  type PlaywrightTestArgs,
  type PlaywrightTestOptions,
  type PlaywrightWorkerArgs,
  type PlaywrightWorkerOptions,
  type TestInfo,
  test,
} from '@playwright/test';

import { open } from '../helpers';
import { signInAs } from './session';
import { nextFrames } from './viewport';

/** Tab from Home through the signed-in menu, the header, and round to Home */
const KEYBOARD_ORDER = [
  'Discover',
  'Overview',
  'Library',
  'History',
  'Stats',
  'Settings',
  'Sign out',
  'tvseri.es home',
  'alex',
  'Search',
  'Close menu',
  'Home',
];

/**
 * The menu and the sticky header, at one viewport width: the phone
 * menu below 768px, the side panel from 768. Run by `menu.spec.ts`
 * (Chromium: all of it on a phone, the side panel's own cases at 1440) and
 * `menu.webkit.spec.ts` (WebKit's focus handling on a phone).
 */

const header = (page: Page) => page.locator('header[data-header-mode]');
const toggle = (page: Page) =>
  header(page).getByRole('button', { name: /^(Menu|Close menu)$/ });
const menu = (page: Page) => page.getByRole('dialog', { name: 'Menu' });
const words = (page: Page) =>
  menu(page)
    .getByRole('listitem')
    .evaluateAll((items) => items.map((item) => item.textContent?.trim()));

/** Is this element the one a click at its centre lands on (nothing on top)? */
const isTopmost = (page: Page, name: string) =>
  header(page)
    .getByRole('link', { exact: true, name })
    .evaluate((element) => {
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      );
      return hit === element || element.contains(hit);
    });

/** Placeholder pages are short: make this one tall, in the test only. */
const makeTall = (page: Page) =>
  page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.style.height = '4000px';
    document.body.append(spacer);
  });

/** Scroll down past 60px (hidden), then up: the pill. */
const showPill = async (page: Page) => {
  await makeTall(page);
  // window scrolls (a wheel over a page's own scroll area would move that)
  for (const y of [20, 900, 700]) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    // within 1px: a fractional scroll position can land a pixel short
    await expect
      .poll(() => page.evaluate((top) => Math.abs(window.scrollY - top), y))
      .toBeLessThanOrEqual(1);
    // the scroll event reaches the header before the next step
    await nextFrames(page);
  }
  await expect(header(page)).toHaveAttribute('data-header-mode', 'floating');
};

/** A point on the page outside the words: the glass (phone) or the dim (desktop) */
const outside = (width: number) =>
  width < 768 ? { x: width - 30, y: 300 } : { x: 200, y: 450 };

type TestBody = (
  fixtures: PlaywrightTestArgs &
    PlaywrightTestOptions &
    PlaywrightWorkerArgs &
    PlaywrightWorkerOptions,
  testInfo: TestInfo,
) => Promise<void>;

type MenuCase =
  | 'back'
  | 'close-pill'
  | 'escape'
  | 'hides'
  | 'keyboard'
  | 'open'
  | 'outside'
  | 'page-chosen'
  | 'signed-in';

/** `cases`: the checks this width needs; every one when left out */
export function menuSuite(
  width: number,
  height: number,
  cases?: ReadonlyArray<MenuCase>,
): void {
  const phone = width < 768;
  const it = (key: MenuCase, title: string, body: TestBody) => {
    if (!cases || cases.includes(key)) {
      test(title, body);
    }
  };
  test.describe(`menu at ${width}`, () => {
    test.use({ viewport: { height, width } });

    it(
      'open',
      'signed out: opens from the top bar with home, discover, sign in; sign in in the header stays clickable',
      async ({ page }) => {
        await open(page, '/discover');
        await toggle(page).click();

        await expect(menu(page)).toBeVisible();
        expect(await words(page)).toEqual(['Home', 'Discover', 'Sign in']);
        await expect(menu(page)).toContainText(
          'An email code or Google. No password.',
        );
        await expect(menu(page).locator('[data-menu-panel]')).toHaveCount(
          phone ? 0 : 1,
        );
        if (!phone) {
          // the dialogs' scrim (BACKDROP.dialog), under the header and the panel
          await expect(menu(page).locator('[data-menu-dim]')).toHaveCSS(
            'background-color',
            /^(rgba\(0, 0, 0, 0\.5\)|oklab\(0 0 0 \/ 0\.5\))$/,
          );
        }
        // lowercase by CSS: the text stays as it is
        const signIn = header(page).getByRole('link', { name: 'Sign in' });
        await expect(signIn).toHaveCSS('text-transform', 'lowercase');
        await expect(
          menu(page).getByRole('link', { name: 'Discover' }),
        ).toHaveCSS('text-transform', 'lowercase');
        await expect(menu(page).getByText('Watch')).toHaveCSS(
          'text-transform',
          'uppercase',
        );
        // the header sits above the menu: Sign in is what a click hits
        expect(await isTopmost(page, 'Sign in')).toBe(true);
        await signIn.hover();
        await expect(signIn).toHaveAttribute(
          'href',
          '/api/auth/login?returnTo=%2Fdiscover',
        );
        // the page under it is inert, never the header
        await expect(page.locator('footer[data-site-footer]')).toHaveJSProperty(
          'inert',
          true,
        );
        await expect(header(page)).toHaveJSProperty('inert', false);
      },
    );

    it(
      'escape',
      'Escape closes and returns focus to the toggle; the page scroll is locked while open',
      async ({ page }) => {
        await open(page, '/discover');
        await makeTall(page);
        await toggle(page).click();
        await expect(menu(page)).toBeVisible();
        await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
        await page.mouse.move(outside(width).x, outside(width).y);
        await page.mouse.wheel(0, 600);
        // nothing to wait for: a locked page does not move. Long enough for an
        // unlocked one to have started its smooth scroll
        await nextFrames(page, 6);
        expect(await page.evaluate(() => window.scrollY)).toBe(0);

        await page.keyboard.press('Escape');
        await expect(menu(page)).toBeHidden();
        await expect(toggle(page)).toBeFocused();
        await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden');
      },
    );

    it(
      'outside',
      'a tap or click outside the words closes it',
      async ({ page }) => {
        await open(page, '/discover');
        await toggle(page).click();
        await expect(menu(page)).toBeVisible();
        await page.mouse.click(outside(width).x, outside(width).y);
        await expect(menu(page)).toBeHidden();
        await expect(page).toHaveURL(/\/discover$/);
      },
    );

    it(
      'back',
      'Back closes it and stays on the page, as on every side panel',
      async ({ page }) => {
        await page.goto('/privacy');
        await open(page, '/discover');
        await toggle(page).click();
        await expect(menu(page)).toBeVisible();
        await page.goBack();
        await expect(menu(page)).toBeHidden();
        await expect(page).toHaveURL(/\/discover$/);
        // Escape leaves no entry behind: the next Back leaves the page
        await toggle(page).click();
        await expect(menu(page)).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(menu(page)).toBeHidden();
        await page.goBack();
        await expect(page).toHaveURL(/\/privacy$/);
      },
    );

    it(
      'page-chosen',
      'a page chosen in the menu takes the menu’s place in the history',
      async ({ page }) => {
        await page.goto('/privacy');
        await open(page, '/discover');
        await toggle(page).click();
        await menu(page)
          .getByRole('link', { exact: true, name: 'Home' })
          .click();
        await expect(page).toHaveURL(/\/$/);
        await expect(menu(page)).toBeHidden();
        await page.goBack();
        await expect(page).toHaveURL(/\/discover$/);
        // WebKit cancels a traversal started while the router still restores
        // the last one ("Navigation canceled by policy check"; two Backs no
        // person presses this close). Back again only then: pressing Back
        // while a traversal is on its way goes past /privacy to the tab's
        // blank page and stays there.
        await expect(page.getByTestId('route-discover')).toBeVisible();
        await page.waitForLoadState('networkidle');
        await expect(async () => {
          await page.goBack().catch((error: unknown) => {
            if (!/canceled/i.test(String(error))) {
              throw error;
            }
            throw new Error('Back was cancelled: press it again');
          });
        }).toPass({ timeout: 10_000 });
        await expect(page).toHaveURL(/\/privacy$/);
      },
    );

    it(
      'signed-in',
      'signed in: opens from the pill; the groups, the current page, and the username stays a clickable link',
      async ({ context, page }) => {
        await signInAs(context, 'alex');
        await open(page, '/u/alex/history');
        await showPill(page);
        await toggle(page).click();
        await expect(menu(page)).toBeVisible();
        // the phone bar settles from the pill into the bar over the glass
        await expect(header(page)).toHaveAttribute(
          'data-header-mode',
          phone ? 'menu' : 'floating',
        );

        expect(await words(page)).toEqual([
          'Home',
          'Discover',
          'Overview',
          'Library',
          'History',
          'Stats',
          'Settings',
          'Sign out',
        ]);
        await expect(menu(page)).toContainText('You · @alex');
        await expect(menu(page).locator('[aria-current="page"]')).toHaveText(
          'History',
        );
        await expect(menu(page).getByText('Dashboard')).toHaveCount(0);

        const username = header(page).getByRole('link', { name: 'alex' });
        await expect(username).toHaveCSS('text-transform', 'lowercase');
        expect(await isTopmost(page, 'alex')).toBe(true);
        await username.click();
        await page.waitForURL((url) => url.pathname === '/u/alex');
        await expect(menu(page)).toBeHidden();
      },
    );

    it(
      'close-pill',
      'closing from the pill brings the pill back',
      async ({ context, page }) => {
        await signInAs(context, 'alex');
        await open(page, '/discover');
        await showPill(page);
        await toggle(page).click();
        await expect(menu(page)).toBeVisible();
        await toggle(page).click();
        await expect(menu(page)).toBeHidden();
        await expect(header(page)).toHaveAttribute(
          'data-header-mode',
          'floating',
        );
      },
    );

    it(
      'keyboard',
      'opened from the keyboard: focus on the first word, then cycles through the menu and the header',
      async ({ browserName, context, page }) => {
        // Safari tabs through links only with Option (its default setting)
        const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
        await signInAs(context, 'alex');
        await open(page, '/discover');
        await toggle(page).focus();
        await page.keyboard.press('Enter');
        const home = menu(page).getByRole('link', { name: 'Home' });
        await expect(home).toBeFocused();

        const order: string[] = [];
        for (let i = 0; i < KEYBOARD_ORDER.length; i += 1) {
          await page.keyboard.press(tab);
          order.push(
            await page.evaluate(
              () =>
                document.activeElement?.getAttribute('aria-label') ??
                document.activeElement?.textContent?.trim() ??
                '',
            ),
          );
        }
        expect(order).toEqual(KEYBOARD_ORDER);
      },
    );

    it(
      'hides',
      'the header hides on scroll down and returns as the pill after 8px up',
      async ({ page }) => {
        await open(page, '/discover');
        await makeTall(page);
        const scrollTo = async (y: number) => {
          await page.evaluate((top) => window.scrollTo(0, top), y);
          // within 1px: a fractional scroll position can land a pixel short
          await expect
            .poll(() =>
              page.evaluate((top) => Math.abs(window.scrollY - top), y),
            )
            .toBeLessThanOrEqual(1);
          // the scroll event reaches the header before the next step
          await nextFrames(page);
        };
        await scrollTo(10);
        await scrollTo(900);
        await expect(header(page)).toHaveAttribute(
          'data-header-mode',
          'hidden',
        );
        await scrollTo(895);
        await scrollTo(893);
        // 7px up is not yet 8: the header stays hidden (no condition to poll)
        await nextFrames(page, 6);
        await expect(header(page)).toHaveAttribute(
          'data-header-mode',
          'hidden',
        );
        await scrollTo(892);
        await expect(header(page)).toHaveAttribute(
          'data-header-mode',
          'floating',
        );
      },
    );
  });
}
