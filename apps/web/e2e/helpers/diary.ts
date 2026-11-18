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

const WARM_UP_MS = 1000;
const MEASURE_MS = 5000;

/**
 * Six notches down, three up: every turn flips the header between hidden
 * and floating, the change that once re-checked the whole page's style
 * (a `:root:has(header…)`), while the run still works its way down the list.
 */
async function wheelPattern(page: Page, ms: number) {
  const end = Date.now() + ms;
  for (let step = 0; Date.now() < end; step += 1) {
    await page.mouse.wheel(0, step % 9 < 6 ? 120 : -120);
    await page.waitForTimeout(16);
  }
}

/**
 * 5 s of scripted wheel through the loaded diary after 1 s of warm-up that
 * is not counted: the main thread's style, layout and script time
 * (Chromium's DevTools metrics, so Chromium only), long tasks, and frames
 * slower than 1.5× the run's median frame. Each run owns its observer and
 * frame loop and stops both when it reads them.
 */
export async function wheelFor5s(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(900, 500);
  await wheelPattern(page, WARM_UP_MS);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metrics = async () => {
    const { metrics: list } = await cdp.send('Performance.getMetrics');
    return new Map(list.map(({ name, value }) => [name, value]));
  };
  await page.evaluate(() => {
    const w = window as unknown as { __wheel?: WheelRun };
    w.__wheel?.stop();
    const run: WheelRun = { frames: [], long: [], stop: () => {} };
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        run.long.push(entry.duration);
      }
    });
    observer.observe({ type: 'longtask' });
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
      observer.disconnect();
    };
    w.__wheel = run;
  });
  const before = await metrics();
  await wheelPattern(page, MEASURE_MS);
  const after = await metrics();
  await cdp.detach();
  const delta = (name: string) =>
    (after.get(name) ?? 0) - (before.get(name) ?? 0);
  const run = await page.evaluate(() => {
    const w = window as unknown as { __wheel?: WheelRun };
    const current = w.__wheel;
    if (!current) {
      throw new Error('wheelFor5s: no run on this page');
    }
    current.stop();
    w.__wheel = undefined;
    // the first gap runs from the setup to the first frame
    return { frames: current.frames.slice(1), long: current.long };
  });
  const sorted = [...run.frames].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  return {
    frames: run.frames.length,
    layoutMs: Math.round(delta('LayoutDuration') * 1000),
    longTasks: run.long.length,
    recalcStyleMs: Math.round(delta('RecalcStyleDuration') * 1000),
    scriptMs: Math.round(delta('ScriptDuration') * 1000),
    slowFrames: run.frames.filter((gap) => gap > median * 1.5).length,
    worstFrame: Math.round(Math.max(0, ...run.frames)),
  };
}
