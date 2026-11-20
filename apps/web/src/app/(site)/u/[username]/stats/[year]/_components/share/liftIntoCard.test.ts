// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { liftIntoCard } from './liftIntoCard';

type Update = () => void;

/** The page: the year's glance with its Share button */
function page() {
  document.body.innerHTML = `
    <section data-share-source><button type="button">Share</button></section>
  `;
  const glance = document.querySelector('section') as HTMLElement;
  const button = document.querySelector('button') as HTMLElement;
  /** The dialog the open draws, with the card's frame */
  const open = vi.fn(() => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<dialog open><span data-share-frame></span></dialog>',
    );
  });
  const frame = () => document.querySelector<HTMLElement>('[data-share-frame]');
  return { button, frame, glance, open };
}

/** A browser that runs view transitions: captures, updates, then finishes */
function stubTransitions() {
  const seen: { before: string; after?: string } = { before: '' };
  let finish: () => void = () => undefined;
  const start = vi.fn((update: Update) => {
    const glance = document.querySelector<HTMLElement>('[data-share-source]');
    seen.before = glance?.style.viewTransitionName ?? '';
    update();
    return {
      finished: new Promise<void>((resolve) => {
        finish = resolve;
      }),
    };
  });
  Object.assign(document, { startViewTransition: start });
  return { finish: () => finish(), seen, start };
}

const stubMotion = (reduce: boolean) =>
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        addEventListener: () => undefined,
        matches: reduce && query.includes('reduce'),
        media: query,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );

beforeEach(() => stubMotion(false));

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, 'startViewTransition');
});

describe('liftIntoCard: the year lifts into the share card as it opens', () => {
  it('names the glance for the old picture and the card’s frame for the new one', async () => {
    const { finish, seen, start } = stubTransitions();
    const { button, frame, glance, open } = page();
    liftIntoCard(button, open);
    expect(start).toHaveBeenCalledOnce();
    expect(seen.before).toBe('year-card');
    expect(open).toHaveBeenCalledOnce();
    expect(glance.style.viewTransitionName).toBe('');
    expect(frame()?.style.viewTransitionName).toBe('year-card');
    finish();
    await Promise.resolve();
    expect(frame()?.style.viewTransitionName).toBe('');
  });

  it('just opens with reduced motion, or where view transitions don’t run', () => {
    stubMotion(true);
    const { start } = stubTransitions();
    const reduced = page();
    liftIntoCard(reduced.button, reduced.open);
    expect(reduced.open).toHaveBeenCalledOnce();
    expect(start).not.toHaveBeenCalled();
    expect(reduced.glance.style.viewTransitionName).toBe('');

    stubMotion(false);
    Reflect.deleteProperty(document, 'startViewTransition');
    const old = page();
    liftIntoCard(old.button, old.open);
    expect(old.open).toHaveBeenCalledOnce();
  });
});
