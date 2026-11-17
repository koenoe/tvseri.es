import type { BrowserContext, Page } from '@playwright/test';

/**
 * A frame recorder for the page colour: injected before any page script, it
 * samples the page on every animation frame for `windowMs` after each
 * navigation event (the document load, `pushState`, `popstate`, `pageshow`)
 * and after `startRecording`. What a frame holds is what the background
 * system draws: the page colour variable, the surfaces that paint it, Home's
 * ground and spotlight, the visible route and the animations running on
 * them. The specs then assert on whole sequences ("no frame with another
 * colour"), not on one moment after the fact.
 */

export type Frame = Readonly<{
  /** ms since the event the frame belongs to */
  t: number;
  /** index into `events` */
  event: number;
  path: string;
  /** `--main-background-color` on :root, computed */
  pageColor: string;
  body: string;
  /** the visible `<main>`'s background */
  main: string | null;
  /** Home's ground (`[data-home-ground]`), visible only */
  ground: string | null;
  /** `data-testid="route-…"` of the routes on screen */
  routes: ReadonlyArray<string>;
  /** the spotlight's pager line (`3 of 10: Dept. Q`) */
  slide: string | null;
  /** the spotlight's artwork layers: slide index and drawn opacity */
  artwork: ReadonlyArray<Readonly<{ index: string; opacity: number }>>;
  /** animations and transitions on the page colour's surfaces */
  animations: ReadonlyArray<
    Readonly<{ name: string; target: string; state: string }>
  >;
}>;

export type FrameEvent = Readonly<{ type: string; t: number; path: string }>;

type Recording = Readonly<{
  events: FrameEvent[];
  frames: Frame[];
  /** The recorder is still sampling (a window is open) */
  recording: boolean;
}>;

/**
 * Runs in the page (serialised by `addInitScript`): no closures, no imports.
 */
function recorder(windowMs: number) {
  const w = window as unknown as { __frames?: unknown };
  if (w.__frames) {
    return;
  }
  const events: Array<{ type: string; t: number; path: string }> = [];
  const frames: unknown[] = [];
  w.__frames = { events, frames, recording: false };
  let until = 0;
  let looping = false;

  const visible = (el: Element) => el.checkVisibility();
  const opacity = (el: Element) => {
    let value = 1;
    for (let n: Element | null = el; n; n = n.parentElement) {
      value *= Number(getComputedStyle(n).opacity);
    }
    return Math.round(value * 100) / 100;
  };
  const surface = (el: Element | null) => {
    if (!el) {
      return null;
    }
    if (el === document.documentElement) return 'html';
    if (el === document.body) return 'body';
    if (el.tagName === 'MAIN') return 'main';
    if (el.matches('[data-home-ground]')) return 'ground';
    if (el.closest('[data-spotlight-layer]')) return 'artwork';
    if (el.matches('[data-site-footer]')) return 'footer';
    // the page backdrop: a layer of <main> outside its content
    const main = el.closest('main');
    const content = el.closest('main > .relative.z-10');
    return main && !content ? 'backdrop' : null;
  };

  const sample = () => {
    const root = document.documentElement;
    const main = [...document.querySelectorAll('main')].find(visible);
    const ground = [...document.querySelectorAll('[data-home-ground]')].find(
      visible,
    );
    const animations = [];
    for (const animation of document.getAnimations()) {
      const target = (animation.effect as KeyframeEffect | null)?.target;
      const name = surface(target ?? null);
      if (name) {
        animations.push({
          name:
            (animation as CSSAnimation).animationName ||
            (animation as CSSTransition).transitionProperty ||
            'animation',
          state: animation.playState,
          target: name,
        });
      }
    }
    frames.push({
      animations,
      artwork: [...document.querySelectorAll('[data-spotlight-layer]')]
        .filter(visible)
        .map((layer) => ({
          index: layer.getAttribute('data-spotlight-layer') ?? '',
          opacity: opacity(layer),
        })),
      body: document.body
        ? getComputedStyle(document.body).backgroundColor
        : '',
      event: events.length - 1,
      ground: ground ? getComputedStyle(ground).backgroundColor : null,
      main: main ? getComputedStyle(main).backgroundColor : null,
      pageColor: getComputedStyle(root)
        .getPropertyValue('--main-background-color')
        .trim(),
      path: location.pathname,
      routes: [...document.querySelectorAll('[data-testid^="route-"]')]
        .filter(visible)
        .map((el) => el.getAttribute('data-testid') ?? ''),
      slide:
        document
          .querySelector('[data-slot="spotlight"] [aria-current="true"]')
          ?.getAttribute('aria-label') ?? null,
      t: performance.now() - (events.at(-1)?.t ?? 0),
    });
  };

  // The window runs `windowMs` past the last change of the routes on
  // screen too: a navigation that commits late (a slow machine) is still
  // recorded from its first frame to its rest, not cut off by the clock
  let lastRoutes = '';
  const state = w.__frames as { recording: boolean };
  const tick = () => {
    if (document.body) {
      sample();
      const routes = String(
        (frames.at(-1) as { routes?: string[] } | undefined)?.routes,
      );
      if (routes !== lastRoutes) {
        lastRoutes = routes;
        until = Math.max(until, performance.now() + windowMs);
      }
    }
    if (performance.now() < until) {
      requestAnimationFrame(tick);
    } else {
      looping = false;
      state.recording = false;
    }
  };

  const start = (type: string) => {
    const t = performance.now();
    events.push({ path: location.pathname, t, type });
    until = t + windowMs;
    state.recording = true;
    if (!looping) {
      looping = true;
      requestAnimationFrame(tick);
    }
  };
  (w.__frames as { start: typeof start }).start = start;

  const push = history.pushState;
  history.pushState = (...args: Parameters<History['pushState']>) => {
    push.apply(history, args);
    start('push');
  };
  addEventListener('popstate', () => start('pop'), true);
  addEventListener('pageshow', () => start('pageshow'));
  start('load');
}

/** Records every page of the context, from its first frame. */
export async function recordFrames(
  context: BrowserContext,
  windowMs = 1500,
): Promise<void> {
  await context.addInitScript(recorder, windowMs);
}

/** Starts a recording window now (an action that is no navigation). */
export async function startRecording(page: Page): Promise<void> {
  await page.evaluate(() =>
    (
      window as unknown as { __frames: { start: (type: string) => void } }
    ).__frames.start('mark'),
  );
}

/** Everything recorded in the current document so far. */
export function readFrames(page: Page): Promise<Recording> {
  return page.evaluate(() => {
    const { events, frames, recording } = (
      window as unknown as { __frames: Recording }
    ).__frames;
    return { events, frames, recording };
  });
}

/** The frames from the last event of `type` on (that event's window). */
export async function framesAfter(
  page: Page,
  type: 'load' | 'push' | 'pop' | 'mark',
): Promise<ReadonlyArray<Frame>> {
  const { events, frames } = await readFrames(page);
  const index = events.map((event) => event.type).lastIndexOf(type);
  if (index < 0) {
    throw new Error(`no ${type} event recorded`);
  }
  // a later event (a redirect's replace is none; a pageshow is) ends it
  const next = events.findIndex(
    (event, i) => i > index && event.type !== 'pageshow',
  );
  return frames.filter(
    (frame) => frame.event >= index && (next < 0 || frame.event < next),
  );
}

/** `#rrggbb` as the browser computes a background (`rgb(r, g, b)`). */
export const rgb = (hex: string): string =>
  `rgb(${[1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

/** The frames on which a route (`route-show`) is on screen. */
export const withRoute = (
  frames: ReadonlyArray<Frame>,
  route: string,
): ReadonlyArray<Frame> => frames.filter((f) => f.routes.includes(route));
