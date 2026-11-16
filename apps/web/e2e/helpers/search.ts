import { expect, type Page } from '@playwright/test';

/** The search overlay, its field and its options. */
export const dialog = (page: Page) =>
  page.getByRole('dialog', { name: 'Search' });

export const field = (page: Page) =>
  page.getByRole('combobox', { name: 'Search series and people' });

export const option = (page: Page, name: string | RegExp) =>
  dialog(page).getByRole('option', { name });

export const marked = (page: Page) =>
  dialog(page).locator('[role="option"][aria-selected="true"]');

/** Hydrated, and the overlay preloaded on idle (the launcher marks it). */
export async function open(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-search-ready', '');
}

/** Opens search from the header's button (every layout and browser has it). */
export async function openFromHeader(page: Page) {
  await page
    .getByRole('banner')
    .getByRole('button', { name: 'Search' })
    .click();
  await expect(field(page)).toBeFocused();
  // the panel grows out of the icon: measure it once the grow has ended
  await page.waitForFunction(() => {
    const surface = document.querySelector('dialog .remote-surface');
    return surface !== null && surface.getAnimations().length === 0;
  });
}

/**
 * Latency for `/api/search`, set per test (the answer is the stub's, fetched
 * at once, then held until `ms` after the request): `failNext` answers the
 * next request with a 502 after the same wait. Read when each request goes
 * out, so a test can change it between queries.
 */
export async function controlSearch(page: Page) {
  const control = { failNext: false, ms: 0 };
  await page.route('**/api/search?**', async (route) => {
    const started = Date.now();
    const { failNext, ms } = control;
    control.failNext = false;
    const response = failNext ? null : await route.fetch().catch(() => null);
    const wait = ms - (Date.now() - started);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    // the page may have aborted it meanwhile (a newer request went out)
    await (response
      ? route.fulfill({ response })
      : route.fulfill({ json: { message: 'Bad gateway' }, status: 502 })
    ).catch(() => undefined);
  });
  return control;
}

/** One animation frame of the overlay, as `sampleSearch` records it. */
export type SearchSample = Readonly<{
  /** the listbox's aria-busy */
  busy: string | null;
  /** ghost cells on screen */
  ghosts: number;
  /** the computed opacity of what is shown (the listbox and the status line) */
  opacity: number;
  /** result options on screen (not the recents) */
  results: number;
  /** the status line's text, if one is shown */
  status: string;
  t: number;
}>;

type Recorder = {
  /** when each key reached the field */
  inputs: number[];
  samples: SearchSample[];
  shifts: Array<{ t: number; value: number }>;
};

/**
 * Records every animation frame of the overlay's body from now on, the
 * keys typed and the layout shifts the browser reports (Chromium), with
 * their times (`performance.now()`).
 */
export async function sampleSearch(page: Page) {
  await page.evaluate(() => {
    const recorder: Recorder = { inputs: [], samples: [], shifts: [] };
    Reflect.set(window, '__searchRecorder', recorder);
    document.addEventListener(
      'input',
      (event) => recorder.inputs.push(event.timeStamp),
      true,
    );
    if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          recorder.shifts.push({
            t: entry.startTime,
            value: Number(Reflect.get(entry, 'value')),
          });
        }
      }).observe({ type: 'layout-shift' });
    }
    const tick = () => {
      const listbox = document.getElementById('search-results');
      if (listbox) {
        const shown = listbox.parentElement;
        const status = shown?.querySelector(':scope > p');
        recorder.samples.push({
          busy: listbox.getAttribute('aria-busy'),
          ghosts: listbox.querySelectorAll('[data-ghost]').length,
          opacity: shown ? Number(getComputedStyle(shown).opacity) : 1,
          results: listbox.querySelectorAll(
            '[role="group"]:not([aria-labelledby="search-label-recent"]) [role="option"]',
          ).length,
          status: status?.textContent ?? '',
          t: performance.now(),
        });
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
  return {
    read: () =>
      page.evaluate(() => Reflect.get(window, '__searchRecorder') as Recorder),
  };
}

/** The values a run of samples went through, repeats dropped (false, true, false). */
export const changes = <T>(values: ReadonlyArray<T>) =>
  values.filter((value, i) => i === 0 || value !== values[i - 1]);

const panel = (page: Page) => dialog(page).locator('.remote-surface');

const firstGhostPoster = (page: Page) =>
  dialog(page).locator('[data-ghost="show"]').first().locator('span').first();

const firstPoster = (page: Page) =>
  dialog(page)
    .getByRole('group', { name: 'Series' })
    .getByRole('option')
    .first()
    .locator('span')
    .first();

/** The second block's overline: People under the ghosts or the results */
const secondOverline = (page: Page) =>
  page.evaluate(() => {
    const ghost = document.querySelector('[data-ghost="person"]')?.parentElement
      ?.previousElementSibling;
    const label = document.getElementById('search-label-people');
    const box = (ghost ?? label)?.getBoundingClientRect();
    return box ? { x: box.x, y: box.y } : null;
  });

/**
 * SR Loading's first query on a slow answer: types “the bear” (7 shows, then
 * 1 person: the ghosts' two rows of posters, then People) into an open,
 * empty search and measures the ghosts and the results that replace them.
 */
export async function firstQueryOnSlow(page: Page, slow: number) {
  const recorder = await sampleSearch(page);
  await field(page).fill('the bear');
  await expect(firstGhostPoster(page)).toBeVisible();
  const ghosts = {
    overline: await secondOverline(page),
    panel: await panel(page).boundingBox(),
    poster: await firstGhostPoster(page).boundingBox(),
  };
  await expect(option(page, /^The Bear/).first()).toBeVisible({
    timeout: slow + 2000,
  });
  // past the 150 ms fade-in: nothing in the panel is still animating
  await page.waitForFunction(
    () =>
      document
        .querySelector('dialog .remote-surface')
        ?.getAnimations({ subtree: true }).length === 0,
  );
  const landed = {
    overline: await secondOverline(page),
    panel: await panel(page).boundingBox(),
    poster: await firstPoster(page).boundingBox(),
  };

  const { inputs, samples, shifts } = await recorder.read();
  // from the first ghost (before it: the recents, or no body at all)
  const from = samples.findIndex((sample) => sample.ghosts > 0);
  const after = samples.slice(Math.max(from, 0));
  const firstGhost = after[0]?.t ?? 0;
  const landedAt = after.find((sample) => sample.results > 0)?.t ?? 0;
  return {
    busy: changes(after.map((sample) => sample.busy)),
    dimmed: after.some((sample) => sample.opacity < 1),
    ghosts,
    /** ms from the key to the first frame with ghosts */
    ghostsAfter: firstGhost - (inputs.at(-1) ?? 0),
    landed,
    /** layout shifts from the ghosts until 300 ms after the results (Chromium) */
    shifts: shifts.filter(
      (shift) => shift.t >= firstGhost && shift.t <= landedAt + 300,
    ),
    shown: changes(
      after.map((sample) =>
        sample.ghosts ? 'ghosts' : sample.results ? 'results' : 'none',
      ),
    ),
  };
}

/**
 * Enter-ahead (P-SR-5): Enter while “bryan cranston” is pending (the stub
 * answers after 1.2 s) opens its first result as soon as it lands.
 * `slowRender`: a busy server, where the person page's full (dynamic) render
 * takes 8 s while its cached route and shell (the prefetch) answer at once;
 * the URL must still change at once.
 */
export async function enterAhead(
  page: Page,
  { slowRender = false }: Readonly<{ slowRender?: boolean }> = {},
) {
  if (slowRender) {
    await page.route('**/person/17419/bryan-cranston?_rsc=*', async (route) => {
      if (!route.request().headers()['next-router-prefetch']) {
        await new Promise((resolve) => setTimeout(resolve, 8000));
      }
      await route.continue().catch(() => undefined);
    });
  }
  await open(page);
  await openFromHeader(page);
  await field(page).fill('bryan cranston');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/');

  // 1.2 s for the answer, then the page's shell
  await expect(page).toHaveURL('/person/17419/bryan-cranston', {
    timeout: slowRender ? 4000 : 5000,
  });
}
