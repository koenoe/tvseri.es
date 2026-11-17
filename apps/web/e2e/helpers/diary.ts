import type { Page } from '@playwright/test';

/** History's scroll performance helpers, shared by the Chromium and WebKit specs */

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

type WheelRun = {
  frames: number[];
  long: number[];
  stop: () => void;
};

/**
 * 5 s of scripted wheel through the loaded diary: long tasks and slow frames.
 * Each run owns its observer and frame loop and stops both when it reads
 * them, so repeated runs on one page count only their own 5 s.
 */
export async function wheelFor5s(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const w = window as unknown as { __wheel?: WheelRun };
    w.__wheel?.stop();
    const run: WheelRun = { frames: [], long: [], stop: () => {} };
    const observer = PerformanceObserver.supportedEntryTypes.includes(
      'longtask',
    )
      ? new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            run.long.push(entry.duration);
          }
        })
      : null;
    observer?.observe({ type: 'longtask' });
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      run.frames.push(now - last);
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    run.stop = () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
    w.__wheel = run;
  });
  await page.mouse.move(900, 500);
  const end = Date.now() + 5000;
  while (Date.now() < end) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(16);
  }
  return page.evaluate(() => {
    const w = window as unknown as { __wheel?: WheelRun };
    const run = w.__wheel;
    if (!run) {
      throw new Error('wheelFor5s: no run on this page');
    }
    run.stop();
    w.__wheel = undefined;
    const frames = run.frames.slice(2);
    return {
      frames: frames.length,
      longTasks: run.long.filter((duration) => duration > 50).length,
      slowFrames: frames.filter((gap) => gap > 25).length,
      worstFrame: Math.round(Math.max(0, ...frames)),
    };
  });
}
