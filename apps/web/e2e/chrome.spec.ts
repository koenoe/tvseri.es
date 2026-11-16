import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

import { open } from './helpers';

/**
 * Header, menu, footer and page colour parity.
 */

const header = (page: Page) => page.locator('header[data-header-mode]');
const glass = (page: Page) => header(page).locator('[data-header-glass]');
const viewportWidth = (page: Page) =>
  page.evaluate(() => document.documentElement.clientWidth);

// The display-only username cookie (auth/cookies.ts) gives the signed-in
// look. A production server's proxy drops it on every request without a
// session, so it is set in the page after the load; the header follows
// cookie changes (Cookie Store API).
const USERNAME = 'margaux';
const signIn = async (page: Page) => {
  // The cookie is a stand-in for the auth callback: with no session behind it,
  // the library request a tile makes (Watched labels) would clear it again.
  await page.route('**/api/me/library-ids', (route) =>
    route.fulfill({
      json: { favorites: [], inProgress: [], watched: [], watchlist: [] },
    }),
  );
  await page.evaluate((name) => {
    // biome-ignore lint/suspicious/noDocumentCookie: the test plays the auth callback
    document.cookie = `__tvseries_user=${name}; path=/`;
  }, USERNAME);
  await expect(
    page.getByRole('banner').getByRole('link', { name: USERNAME }),
  ).toBeVisible();
};

/** Placeholder pages are short: make this one tall, in the test only. */
const makeTall = (page: Page) =>
  page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.style.height = '4000px';
    document.body.append(spacer);
  });

/** Scroll down past 60px (hidden), then a little up: the pill. */
const showPill = async (page: Page) => {
  await makeTall(page);
  await page.mouse.move(200, 400);
  // the first scroll event is the tracker's baseline
  await page.mouse.wheel(0, 20);
  await page.mouse.wheel(0, 800);
  await expect(header(page)).toHaveAttribute('data-header-mode', 'hidden');
  await page.mouse.wheel(0, -200);
  await expect(header(page)).toHaveAttribute('data-header-mode', 'floating');
  // settled: the slide-in and the glass fade are done
  await expect(glass(page)).toHaveCSS('opacity', '1');
  await expect
    .poll(async () => (await glass(page).boundingBox())?.y)
    .toBe(page.viewportSize()?.width === 390 ? 12 : 24);
};

test.describe('static shell', () => {
  test('the header and footer of / are in the static shell', async ({
    page,
    baseURL,
  }) => {
    await instant(
      page,
      async () => {
        await page.goto('/');
        await expect(page.getByRole('banner')).toBeVisible();
        await expect(
          page.getByRole('link', { name: 'tvseri.es home' }),
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Search' }),
        ).toBeVisible();
        await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
        await expect(page.getByRole('contentinfo')).toBeVisible();
        await expect(page.getByRole('link', { name: 'TMDB' })).toBeVisible();
      },
      { baseURL },
    );
  });

  test('the server HTML is the same signed in and out', async ({ request }) => {
    const signedOut = await (await request.get('/discover')).text();
    const signedIn = await (
      await request.get('/discover', {
        headers: { cookie: `__tvseries_user=${USERNAME}` },
      })
    ).text();

    expect(signedIn).not.toContain(USERNAME);
    const shell = (html: string) =>
      html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? '';
    expect(shell(signedIn)).toBe(shell(signedOut));
    expect(shell(signedOut)).not.toBe('');
  });
});

test.describe('header', () => {
  test('signed out: Sign in returns to the current page', async ({ page }) => {
    await open(page, '/discover');
    const signInLink = page.getByRole('link', { name: 'Sign in' });
    await signInLink.hover();
    await expect(signInLink).toHaveAttribute(
      'href',
      '/api/auth/login?returnTo=%2Fdiscover',
    );
  });

  test('signed in: the username links to the profile', async ({ page }) => {
    await open(page, '/discover');
    await signIn(page);
    await expect(
      page.getByRole('banner').getByRole('link', { name: USERNAME }),
    ).toHaveAttribute('href', `/u/${USERNAME}`);
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(0);
  });

  test('the pill geometry: 24px logo, 32px from the top in the 1280px container', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await open(page, '/discover');
    const logo = page
      .getByRole('link', { name: 'tvseri.es home' })
      .getByRole('img')
      .filter({ visible: true });
    const box = await logo.boundingBox();
    const width = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(box?.height).toBe(24);
    expect(box?.width).toBeCloseTo(124.1, 0);
    expect(box?.x).toBeCloseTo((width - 1280) / 2 + 32, 0);
    expect(box?.y).toBe(32);
  });
});

test.describe('header modes', () => {
  test('scrolling down past 60px hides it, scrolling up shows the pill, a navigation resets it', async ({
    page,
  }) => {
    await open(page, '/');
    await expect(header(page)).toHaveAttribute('data-header-mode', 'static');

    // The spacer is not React's, so it survives the client navigation below.
    await makeTall(page);
    await page.mouse.move(600, 400);

    await page.mouse.wheel(0, 40);
    await expect(header(page)).toHaveAttribute('data-header-mode', 'static');

    await page.mouse.wheel(0, 800);
    await expect(header(page)).toHaveAttribute('data-header-mode', 'hidden');

    await page.mouse.wheel(0, -200);
    await expect(header(page)).toHaveAttribute('data-header-mode', 'floating');
    await expect(header(page)).toHaveCSS('position', 'fixed');
    await expect(
      page.getByRole('link', { name: 'tvseri.es home' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('link', { name: 'Discover' }).click();
    await page.waitForURL((url) => url.pathname === '/discover');
    await expect(header(page)).toHaveAttribute('data-header-mode', 'static');
  });

  test('the pill is 1024px wide, 24px from the top, 56px tall, 20px logo', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await open(page, '/discover');
    await showPill(page);

    await expect(glass(page)).toHaveCSS('opacity', '1');
    const box = await glass(page).boundingBox();
    expect(box?.height).toBe(56);
    expect(box?.width).toBe(1024);
    expect(box?.x).toBeCloseTo(((await viewportWidth(page)) - 1024) / 2, 0);
    expect(box?.y).toBe(24);
    const logo = page
      .getByRole('link', { name: 'tvseri.es home' })
      .getByRole('img')
      .filter({ visible: true });
    expect((await logo.boundingBox())?.height).toBe(20);
  });

  test('the pill’s glass is production’s, layer for layer, with no tint', async ({
    page,
  }) => {
    await open(page, '/discover');
    await showPill(page);
    await expect(glass(page)).toHaveCSS('opacity', '1');
    const layers = await header(page).evaluate((element) =>
      [
        ...element.querySelectorAll<HTMLElement>('[data-header-glass-layer]'),
      ].map((layer) => {
        const style = getComputedStyle(layer);
        return {
          backdrop: style.backdropFilter,
          background: style.backgroundColor,
          image: style.backgroundImage,
          name: layer.dataset.headerGlassLayer,
          radius: style.borderRadius,
          shadow: style.boxShadow,
          z: style.zIndex,
        };
      }),
    );
    expect(layers.map((layer) => [layer.name, layer.z])).toEqual([
      ['shadow', '0'],
      ['blur', '1'],
      ['white', '2'],
      ['edge', '3'],
    ]);
    const [shadow, blur, white, edge] = layers;
    expect(shadow?.shadow).toContain('0px 10px 15px -3px');
    expect(blur?.backdrop).toBe('blur(4px)');
    // white at 10% (Chrome reports Tailwind's colour in oklab)
    expect(white?.background).toMatch(
      /^(rgba\(255, 255, 255, 0\.1\)|oklab\(0\.99\d* [-\de.]+ [-\de.]+ \/ 0\.1\))$/,
    );
    for (const layer of layers) {
      expect(layer.image, layer.name).toBe('none');
      expect(layer.radius, layer.name).toBe('12px');
    }
    expect(edge?.shadow).toBe(
      'rgba(255, 255, 255, 0.15) 1px 1px 1px 0px inset',
    );
  });

  test('the pill’s search button asks the search overlay to open', async ({
    page,
  }) => {
    await open(page, '/discover');
    await showPill(page);
    await page.evaluate(() => {
      window.addEventListener('tvseries:open-search', () => {
        document.body.dataset.searchOpened = 'yes';
      });
    });

    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.locator('body')).toHaveAttribute(
      'data-search-opened',
      'yes',
    );
  });

  test('keyboard focus moving into the hidden header shows the pill', async ({
    page,
  }) => {
    await open(page, '/discover');
    await makeTall(page);
    await page.mouse.move(600, 400);
    await page.mouse.wheel(0, 20);
    await page.mouse.wheel(0, 800);
    await expect(header(page)).toHaveAttribute('data-header-mode', 'hidden');

    await page.getByRole('link', { name: 'tvseri.es home' }).focus();
    await expect(header(page)).toHaveAttribute('data-header-mode', 'floating');
  });

  test('a phone gets the pill 12px from the edges with the 20px logo', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await open(page, '/discover');
    await showPill(page);

    const box = await glass(page).boundingBox();
    expect(box).toMatchObject({ height: 56, x: 12, y: 12 });
    expect(box?.width).toBe((await viewportWidth(page)) - 24);
  });
});

test.describe('menu', () => {
  // The menu itself is covered at 390, 1024 and 1440 in menu.spec.ts
  test('phone: following a word closes the menu', async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await open(page, '/');
    await page.getByRole('button', { name: 'Menu' }).click();
    const dialog = page.getByRole('dialog', { name: 'Menu' });
    await dialog.getByRole('link', { name: 'Discover' }).click();
    await page.waitForURL((url) => url.pathname === '/discover');
    await expect(dialog).toBeHidden();
  });
});

// Timing-based: opt-in (`E2E_PERF=1`), so a loaded machine can't fail the default run.
test.describe('performance (lenient: catches regressions, not tuning) @perf', () => {
  test('scrolling down and up through the pill keeps frames smooth', async ({
    page,
  }) => {
    await open(page, '/discover');
    await makeTall(page);
    // its own layer, by transform only: `opacity` would make it a backdrop
    // root and the pill's blur would stop reaching the page (HeaderFrame)
    await expect(header(page)).toHaveCSS('will-change', 'transform');
    await page.evaluate(() => {
      const w = window as unknown as { __frames: number[]; __run: boolean };
      w.__frames = [];
      w.__run = true;
      let last = performance.now();
      const tick = (now: number) => {
        w.__frames.push(now - last);
        last = now;
        if (w.__run) {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    });
    await page.mouse.move(400, 500);
    const wheel = async (dy: number, times: number) => {
      for (let i = 0; i < times; i += 1) {
        await page.mouse.wheel(0, dy);
        await page.waitForTimeout(16);
      }
    };
    await wheel(40, 30);
    await wheel(-30, 15);
    await wheel(40, 15);
    await wheel(-40, 40);
    await page.waitForTimeout(400);

    const frames = await page.evaluate(() => {
      const w = window as unknown as { __frames: number[]; __run: boolean };
      w.__run = false;
      return w.__frames.slice(2).sort((a, b) => a - b);
    });
    const p95 = frames[Math.floor(frames.length * 0.95)] ?? 0;
    expect(frames.length).toBeGreaterThan(60);
    expect(p95).toBeLessThan(50);
  });

  test('the menu opens and closes without input lag', async ({ page }) => {
    await open(page, '/discover');
    await page.evaluate(() => {
      const w = window as unknown as { __events: number[] };
      w.__events = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          w.__events.push(entry.duration);
        }
      }).observe({ durationThreshold: 16, type: 'event' });
    });
    for (let i = 0; i < 2; i += 1) {
      await page.getByRole('button', { name: 'Menu' }).click();
      await page.getByRole('button', { name: 'Close menu' }).click();
    }
    await page.waitForTimeout(300);
    const durations = await page.evaluate(
      () => (window as unknown as { __events: number[] }).__events,
    );
    expect(Math.max(0, ...durations)).toBeLessThan(200);
  });
});

test.describe('page colour', () => {
  const SHOW = '/136315/the-bear';
  // The stub's The Bear: backdropColor #29251f
  const COLOUR = 'rgb(41, 37, 31)';
  const GROUND = 'rgb(28, 34, 35)';
  const bodyColour = (page: Page) =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  test('hard refresh and Back paint the colour on the first frame', async ({
    page,
  }) => {
    await page.goto(SHOW);
    expect(await bodyColour(page)).toBe(COLOUR);

    // Hard refresh: every frame from the first one has the show's colour.
    await page.addInitScript(() => {
      const frames: string[] = [];
      Object.assign(window, { __frames: frames });
      const record = () => {
        if (document.body) {
          frames.push(getComputedStyle(document.body).backgroundColor);
        }
        if (frames.length < 60) {
          requestAnimationFrame(record);
        }
      };
      requestAnimationFrame(record);
    });
    await page.reload();
    await page.waitForFunction(
      () => (window as unknown as { __frames: string[] }).__frames.length >= 30,
    );
    const frames = await page.evaluate(
      () => (window as unknown as { __frames: string[] }).__frames,
    );
    expect(frames.length).toBeGreaterThan(0);
    expect(new Set(frames)).toEqual(new Set([COLOUR]));

    // Away to the ground and Back: no ground frame on the show page.
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('link', { name: 'Discover' }).click();
    await page.waitForURL((url) => url.pathname === '/discover');
    await expect.poll(() => bodyColour(page)).toBe(GROUND);
    await page.evaluate(() => {
      const back: Array<readonly [string, string]> = [];
      Object.assign(window, { __back: back });
      const record = () => {
        back.push([
          location.pathname,
          getComputedStyle(document.body).backgroundColor,
        ]);
        if (back.length < 240) {
          requestAnimationFrame(record);
        }
      };
      requestAnimationFrame(record);
    });
    await page.goBack();
    await page.waitForURL((url) => url.pathname === SHOW);
    await page.waitForTimeout(300);
    const back = await page.evaluate(
      () =>
        (window as unknown as { __back: Array<readonly [string, string]> })
          .__back,
    );
    const onShow = back.filter(([path]) => path === SHOW);
    expect(onShow.length).toBeGreaterThan(0);
    expect(new Set(onShow.map(([, colour]) => colour))).toEqual(
      new Set([COLOUR]),
    );
  });

  test('a colour that is not a six-digit hex paints the ground', async ({
    page,
  }) => {
    // The stub's 900099 (fixtures/show-hero.ts) sends a CSS injection.
    await page.goto('/900099/bad-colour');
    expect(await bodyColour(page)).toBe(GROUND);
    expect(await page.content()).not.toContain('evil.example');
  });
});
