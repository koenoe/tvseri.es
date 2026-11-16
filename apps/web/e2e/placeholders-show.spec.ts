import { instant } from '@next/playwright';
import { expect, test } from '@playwright/test';
import { expectParity, parityTable } from './helpers/parity';
import { namedViewports } from './helpers/placeholders';
import { setLibraryHint, signInAs } from './helpers/session';
import { measureParity } from './helpers/shellParity';
import { fontsSettled } from './helpers/viewport';

// Shell mechanism: `instant()` (`helpers/shellParity.ts`); the shell and the viewer's holes are held by `instant()` on the production build.

/**
 * Placeholder parity for the show page (`helpers/shellParity.ts`): every
 * placeholder is the box of what replaces it, and nothing shifts.
 *
 * - The page shell (a show nobody has visited: `/900004`, the stub's median
 *   show: a two-line description, twelve keywords, three seasons): the whole
 *   page, section by section.
 * - The viewer's holes on a prerendered show (The Bear): the progress line,
 *   the first-tracking prompt, the actions and the episodes wall.
 *
 * Known, deliberate differences,
 * so they are not asserted: the age rating and provider are the end of a row
 * (its width follows the region); a viewer's own season can be a different
 * height than the signed-out default's. The first-tracking prompt is shell
 * content for everyone, hidden before the first paint where
 * this browser knows it isn't for the viewer.
 */

const VIEWPORTS = [
  ...namedViewports('desktop', 'phone'),
  // a small phone: where the season header's facts wrap to two lines
  { height: 780, name: 'small phone', width: 360 },
  ...namedViewports('tablet', 'laptop'),
];

const SHELL = [
  'show',
  'progress',
  'imdb',
  'actions',
  'cast-block',
  'episodes-section',
  'recommendations',
  'lower-band',
  'storyline-grid',
  'keywords',
  'information',
] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`show ${viewport.name}`, () => {
    test.use({ viewport });

    for (const viewer of [null, 'nina'] as const) {
      test(`page shell, ${viewer ?? 'signed out'}`, async ({
        baseURL,
        context,
        page,
      }) => {
        if (viewer) {
          await signInAs(context, viewer);
          await setLibraryHint(context, viewer, []);
        }
        const parity = await measureParity(page, {
          baseURL,
          goto: () => page.goto('/900004/harbour-lights'),
          ready: () =>
            expect(page.locator('[data-placeholder="show"]')).toBeVisible(),
          shot: `show-shell-${viewport.name}${viewer ? `-${viewer}` : ''}`,
        });
        console.log(parityTable(parity, `${viewport.name} shell`));
        expectParity(parity, { names: [...SHELL, 'first-tracking'] });
      });
    }

    test('the Bear, signed out: the wall and the viewer holes', async ({
      baseURL,
      page,
    }) => {
      const parity = await measureParity(page, {
        baseURL,
        goto: () => page.goto('/136315/the-bear'),
        ready: () =>
          expect(
            page.locator('[data-placeholder="progress"]').first(),
          ).toBeAttached(),
        shellText: 'A made-up kitchen drama about a family sandwich shop.',
        shot: `show-bear-out-${viewport.name}`,
      });
      console.log(parityTable(parity, `${viewport.name} bear out`));
      // a visitor is asked too (answering asks them to sign in)
      expect(parity.slots['first-tracking']?.height ?? 0).toBeGreaterThan(60);
      expectParity(parity, { names: ['progress', 'actions', 'episodes'] });
    });

    test('a show the viewer has not tracked: the prompt has its space', async ({
      baseURL,
      context,
      page,
    }) => {
      await signInAs(context, 'nina');
      await setLibraryHint(context, 'nina', [7]);
      const parity = await measureParity(page, {
        baseURL,
        goto: () => page.goto('/136315/the-bear'),
        ready: () =>
          expect(
            page.locator('[data-placeholder="progress"]').first(),
          ).toBeAttached(),
        shellText: 'A made-up kitchen drama about a family sandwich shop.',
        shot: `show-bear-nina-${viewport.name}`,
      });
      console.log(parityTable(parity, `${viewport.name} bear nina`));
      // the prompt is shell content now: it is simply there, nothing streams in
      expect(parity.slots['first-tracking']?.height ?? 0).toBeGreaterThan(60);
      expectParity(parity, { names: ['progress', 'actions', 'episodes'] });
    });

    test('a tracked show: nothing is reserved and nothing closes', async ({
      baseURL,
      context,
      page,
    }) => {
      await signInAs(context, 'alex');
      await setLibraryHint(context, 'alex', [136315]);
      const parity = await measureParity(page, {
        baseURL,
        goto: () => page.goto('/136315/the-bear'),
        ready: () =>
          expect(
            page.locator('[data-placeholder="progress"]').first(),
          ).toBeAttached(),
        shellText: 'A made-up kitchen drama about a family sandwich shop.',
      });
      console.log(parityTable(parity, `${viewport.name} bear alex tracked`));
      expect(parity.placeholders['first-tracking']?.height ?? 0).toBe(0);
      expect(parity.slots['first-tracking']?.height ?? 0).toBe(0);
      expectParity(parity, { names: ['progress', 'actions'] });
    });

    test("another account's hint is not used", async ({
      baseURL,
      context,
      page,
    }) => {
      await signInAs(context, 'nina');
      // alex's hint, in nina's browser
      await setLibraryHint(context, 'alex', [7]);
      const parity = await measureParity(page, {
        baseURL,
        goto: () => page.goto('/136315/the-bear'),
        ready: () =>
          expect(
            page.locator('[data-placeholder="progress"]').first(),
          ).toBeAttached(),
        shellText: 'A made-up kitchen drama about a family sandwich shop.',
      });
      // nina sees the prompt: alex's hint says nothing about her
      expect(parity.slots['first-tracking']?.height ?? 0).toBeGreaterThan(60);
    });

    test('no hint yet (a first visit): the prompt is there, and the app writes the hint', async ({
      baseURL,
      context,
      page,
    }) => {
      await signInAs(context, 'nina');
      const parity = await measureParity(page, {
        baseURL,
        goto: () => page.goto('/136315/the-bear'),
        ready: () =>
          expect(
            page.locator('[data-placeholder="progress"]').first(),
          ).toBeAttached(),
        shellText: 'A made-up kitchen drama about a family sandwich shop.',
      });
      expect(parity.slots['first-tracking']?.height ?? 0).toBeGreaterThan(60);
      // the prompt appears, and the library ids are kept for next time
      await expect(
        page.getByRole('group', { name: 'Where are you in this series?' }),
      ).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(() =>
            window.localStorage.getItem('tvseries:library-hint'),
          ),
        )
        .toContain('"u":"nina"');
    });
  });
}

/**
 * The inline script runs before the first paint on every page, so what it
 * costs is what it does, not how fast this machine is: with a 5000-show
 * library it reads its two hints, parses one, writes only attributes of
 * `<html>`, reads no layout and stays small. (A wall-clock budget measured
 * the machine's load, not the script.)
 */
/**
 * The first-tracking card's placeholder (it looked like the
 * card itself, glass and all): flat ghosts in the card's box, with no words,
 * controls, blur or shadow; the card, its question line, its three answers
 * and Not now land within 2px of the real ones (the question's width follows
 * the show's title, so only its line is compared).
 */
for (const viewport of VIEWPORTS.slice(0, 2)) {
  test(`the prompt's placeholder is flat ghosts in the card's geometry (${viewport.name})`, async ({
    baseURL,
    page,
  }) => {
    await page.setViewportSize(viewport);
    const read = (card: Element) => {
      const box = (node: Element | null | undefined) => {
        const rect = node?.getBoundingClientRect();
        return {
          h: rect?.height ?? 0,
          w: rect?.width ?? 0,
          x: rect?.left ?? 0,
          y: rect?.top ?? 0,
        };
      };
      const [title, answers, notNow] = [...card.children];
      const style = getComputedStyle(card);
      return {
        answers: [...(answers?.children ?? [])].map(box),
        backdrop: style.backdropFilter,
        card: box(card),
        connected: card.isConnected,
        controls: card.querySelectorAll('button, a, [tabindex]').length,
        notNow: box(notNow),
        shadow: style.boxShadow,
        text: (card.textContent ?? '').replace(/\u200b/g, '').trim(),
        title: box(title),
      };
    };
    let ghost: ReturnType<typeof read> | undefined;
    await instant(
      page,
      async () => {
        await page.goto('/900004/harbour-lights');
        const placeholder = page.locator('[data-placeholder="prompt-card"]');
        await expect(placeholder).toBeVisible();
        await fontsSettled(page);
        // the shell's parts are swapped in as they are parsed: a ghost read
        // just as it was replaced is read again (the one now on screen)
        await expect(async () => {
          const once = await placeholder.evaluate(read);
          expect(once.connected, 'the ghost was replaced').toBe(true);
          ghost = once;
        }).toPass();
      },
      baseURL ? { baseURL } : undefined,
    );
    const card = page.getByRole('group', {
      name: 'Where are you in this series?',
    });
    await expect(card).toBeVisible();
    const real = await card.evaluate(read);
    expect(ghost).toBeDefined();
    if (!ghost) {
      return;
    }
    expect(ghost.text).toBe('');
    expect(ghost.controls).toBe(0);
    expect(ghost.backdrop).toBe('none');
    expect(ghost.shadow).toBe('none');
    expect(real.backdrop).not.toBe('none');
    const near = (a: number, b: number, what: string) =>
      expect(Math.abs(a - b), `${what}: ${a} vs ${b}`).toBeLessThanOrEqual(2);
    for (const key of ['x', 'y', 'w', 'h'] as const) {
      near(ghost.card[key], real.card[key], `card ${key}`);
      near(ghost.notNow[key], real.notNow[key], `Not now ${key}`);
    }
    for (const key of ['x', 'y', 'h'] as const) {
      near(ghost.title[key], real.title[key], `question ${key}`);
    }
    expect(ghost.answers).toHaveLength(3);
    ghost.answers.forEach((answer, index) => {
      for (const key of ['x', 'y', 'w', 'h'] as const) {
        near(
          answer[key],
          real.answers[index]?.[key] ?? 0,
          `answer ${index} ${key}`,
        );
      }
    });
  });
}

test('the pre-paint hint script does a bounded amount of work, even with a 5000-show library', async ({
  baseURL,
  context,
  page,
}) => {
  await signInAs(context, 'nina');
  await setLibraryHint(
    context,
    'nina',
    Array.from({ length: 5000 }, (_, index) => index + 1),
  );
  await page.goto(`${baseURL}/136315/the-bear`);
  const result = await page.evaluate(() => {
    const script = [...document.scripts].find((item) =>
      item.textContent?.includes('data-show-prompt'),
    )?.textContent;
    if (!script) {
      return null;
    }
    // the app has written the viewer's real library by now: put the big one back
    window.localStorage.setItem(
      'tvseries:library-hint',
      JSON.stringify({
        ids: Array.from({ length: 5000 }, (_, index) => index + 136_000),
        u: 'nina',
        v: 1,
      }),
    );
    const calls: Record<string, number> = {};
    const count = (name: string) => {
      calls[name] = (calls[name] ?? 0) + 1;
    };
    const watch = <T extends object>(
      target: T,
      name: keyof T & string,
      label: string,
    ) => {
      const original = target[name] as unknown as (
        ...args: unknown[]
      ) => unknown;
      Object.defineProperty(target, name, {
        configurable: true,
        value(this: unknown, ...args: unknown[]) {
          count(label);
          return original.apply(this, args);
        },
      });
      return () =>
        Object.defineProperty(target, name, {
          configurable: true,
          value: original,
        });
    };
    const restore = [
      watch(Storage.prototype, 'getItem', 'storage.getItem'),
      watch(Storage.prototype, 'setItem', 'storage.setItem'),
      watch(JSON, 'parse', 'JSON.parse'),
      watch(Element.prototype, 'getBoundingClientRect', 'layout read'),
      watch(Element.prototype, 'getClientRects', 'layout read'),
      watch(window, 'getComputedStyle', 'layout read'),
    ];
    // every write: to attributes of <html> only
    const writes: string[] = [];
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        writes.push(`${record.type}:${(record.target as Element).tagName}`);
      }
    });
    observer.observe(document, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    // the page's own inline script, run once
    new Function(script)();
    const records = observer.takeRecords();
    for (const record of records) {
      writes.push(`${record.type}:${(record.target as Element).tagName}`);
    }
    observer.disconnect();
    for (const undo of restore) {
      undo();
    }
    return {
      attribute: document.documentElement.getAttribute('data-show-prompt'),
      calls,
      size: script.length,
      writes,
    };
  });
  console.log(`hint script: ${JSON.stringify(result)}`);
  expect(result?.attribute).toBe('no');
  // the library hint, and the Plex hint's key when signed in
  expect(result?.calls['storage.getItem']).toBeLessThanOrEqual(2);
  expect(result?.calls['JSON.parse']).toBe(1);
  expect(result?.calls['storage.setItem'] ?? 0).toBe(0);
  expect(result?.calls['layout read'] ?? 0).toBe(0);
  expect([...new Set(result?.writes)]).toEqual(['attributes:HTML']);
  expect(result?.size ?? 99999).toBeLessThan(3000);
});

/**
 * The season's facts while its episodes load (a season switch) are ghosts of
 * the words they will be (`seasonFactsEstimate`), in the facts' own row: on a
 * small phone Season 2's facts take two lines ("Jun 22, 2023 · 9 of 10
 * watched" / "1 skipped"), and so does their placeholder: the header keeps
 * its height when they land.
 */
for (const width of [360, 390]) {
  test(`the season facts' placeholder takes the facts' lines (${width}px)`, async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ height: 780, width });
    await signInAs(context, 'alex');
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/series/136315/season/2', async (route) => {
      await held;
      await route.continue();
    });
    await page.goto('/136315/the-bear?season=3');
    // the visible header (the shell's signed-out copy stays hidden)
    const header = page
      .locator('[data-season-header]')
      .filter({ visible: true })
      .first();
    await expect(header).toContainText('4 of 10 watched');
    await expect(async () => {
      await header.getByRole('combobox', { name: 'Season' }).click();
      await expect(page.getByRole('option', { name: /^Season 2/ })).toBeVisible(
        { timeout: 1000 },
      );
    }).toPass();
    await page.getByRole('option', { name: /^Season 2/ }).click();
    const ghost = header.locator('[data-placeholder="season-facts"]');
    await expect(ghost).toBeVisible();
    await fontsSettled(page);
    const before = (await header.boundingBox())?.height ?? 0;
    release();
    await expect(ghost).toHaveCount(0);
    await expect(header).toContainText('9 of 10 watched');
    const after = (await header.boundingBox())?.height ?? -1;
    expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
  });
}
