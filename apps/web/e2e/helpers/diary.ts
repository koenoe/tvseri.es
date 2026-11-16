import type { Page } from '@playwright/test';

/** History's perf helpers (§5.3), shared by the Chromium and WebKit specs */

/** Loads the diary until it holds `rows` rows (or the history ends) */
export async function loadRows(page: Page, rows: number) {
  let stalls = 0;
  for (let read = 0; read < 120; read += 1) {
    const count = await page.locator('[data-diary-row]').count();
    if (count >= rows) {
      return count;
    }
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    // the next page (a read of 100) adds rows; the end adds none
    const grew = await page
      .waitForFunction(
        (before) =>
          document.querySelectorAll('[data-diary-row]').length > before,
        count,
        { timeout: 8000 },
      )
      .then(() => true)
      .catch(() => false);
    // a scroll to the bottom while the first page still streams lands short
    // of the sentinel: try once more before calling it the end
    if (!grew) {
      stalls += 1;
      if (stalls > 1) {
        break;
      }
    } else {
      stalls = 0;
    }
  }
  return page.locator('[data-diary-row]').count();
}

/** 5 s of scripted wheel through the loaded diary: long tasks and slow frames */
export async function wheelFor5s(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const w = window as unknown as {
      __frames: number[];
      __long: number[];
      __run: boolean;
    };
    w.__frames = [];
    w.__long = [];
    w.__run = true;
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          w.__long.push(entry.duration);
        }
      }).observe({ type: 'longtask' });
    }
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
  await page.mouse.move(900, 500);
  const end = Date.now() + 5000;
  while (Date.now() < end) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(16);
  }
  return page.evaluate(() => {
    const w = window as unknown as {
      __frames: number[];
      __long: number[];
      __run: boolean;
    };
    w.__run = false;
    const frames = w.__frames.slice(2);
    return {
      frames: frames.length,
      longTasks: w.__long.filter((duration) => duration > 50).length,
      slowFrames: frames.filter((gap) => gap > 25).length,
      worstFrame: Math.round(Math.max(0, ...frames)),
    };
  });
}
