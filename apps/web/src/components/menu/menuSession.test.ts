// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { startMenuSession } from './menuSession';

/** jsdom's history.back() is async: wait for the popstate it fires */
const popped = () =>
  new Promise((resolve) =>
    window.addEventListener('popstate', resolve, { once: true }),
  );

const setUp = () => {
  document.body.innerHTML =
    '<div><header><button id="toggle">Menu</button></header><main></main></div><dialog id="menu"><a href="/discover">discover</a></dialog>';
  const header = document.querySelector('header') as HTMLElement;
  const toggle = document.querySelector('#toggle') as HTMLElement;
  const layer = document.querySelector('#menu') as HTMLElement;
  return { header, layer: () => layer, toggle };
};

afterEach(() => {
  window.history.replaceState(null, '', '/');
  document.body.innerHTML = '';
});

describe('the menu session and Back (one behaviour for every side panel)', () => {
  it('holds one history entry while open; Back closes the menu', async () => {
    const onClose = vi.fn();
    const length = window.history.length;
    const stop = startMenuSession({ ...setUp(), onClose });
    expect(window.history.length).toBe(length + 1);
    const back = popped();
    window.history.back();
    await back;
    expect(onClose).toHaveBeenCalledOnce();
    stop();
    expect(window.history.state).toBeNull();
  });

  it('a close by Escape, ✕ or the dim goes back over its entry, so none stays behind', async () => {
    const onClose = vi.fn();
    const stop = startMenuSession({ ...setUp(), onClose });
    const back = popped();
    stop();
    await back;
    expect(window.history.state).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('a link it follows takes the entry’s place: the session does not go back under the navigation', () => {
    const onClose = vi.fn();
    const parts = setUp();
    const stop = startMenuSession({ ...parts, onClose });
    const back = vi.spyOn(window.history, 'back');
    const link = parts.layer().querySelector('a') as HTMLAnchorElement;
    // the router's own click handler (a Next.js Link) navigates
    link.addEventListener('click', (event) => event.preventDefault());
    link.click();
    stop();
    expect(back).not.toHaveBeenCalled();
    back.mockRestore();
  });
});
