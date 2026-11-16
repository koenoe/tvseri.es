// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import HeaderScrollTracker from './HeaderScrollTracker';
import { HeaderStoreProvider, useHeaderStore } from './HeaderStoreProvider';

let frames: Array<FrameRequestCallback> = [];

const flushFrame = () => {
  const due = frames;
  frames = [];
  for (const callback of due) {
    callback(0);
  }
};

const scrollTo = (y: number) => {
  document.documentElement.scrollTop = y;
  window.dispatchEvent(new Event('scroll'));
};

function Mode() {
  return <span>{useHeaderStore((state) => state.mode)}</span>;
}

const renderTracker = () =>
  render(
    <HeaderStoreProvider>
      <HeaderScrollTracker />
      <Mode />
    </HeaderStoreProvider>,
  );

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  Object.defineProperty(document, 'scrollingElement', {
    configurable: true,
    value: document.documentElement,
  });
  document.documentElement.scrollTop = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HeaderScrollTracker', () => {
  it('reads the position once per frame, however many scroll events came', () => {
    const { container } = renderTracker();
    act(flushFrame);
    // the first change of position is the tracker's baseline
    scrollTo(100);
    act(flushFrame);

    scrollTo(200);
    scrollTo(250);
    scrollTo(300);
    expect(frames).toHaveLength(1);

    act(flushFrame);
    expect(container.textContent).toBe('hidden');
  });

  it('hides scrolling down and shows the pill 8px back up', () => {
    const { container } = renderTracker();
    act(flushFrame);
    scrollTo(100);
    act(flushFrame);

    scrollTo(400);
    act(flushFrame);
    expect(container.textContent).toBe('hidden');

    scrollTo(395);
    act(flushFrame);
    expect(container.textContent).toBe('hidden');

    scrollTo(390);
    act(flushFrame);
    expect(container.textContent).toBe('floating');
  });

  it('measures a page that opens scrolled (a restored position) on mount', () => {
    document.documentElement.scrollTop = 900;
    const { container } = renderTracker();
    act(flushFrame);
    // the first reading is the baseline: still the static bar
    expect(container.textContent).toBe('static');

    scrollTo(950);
    act(flushFrame);
    expect(container.textContent).toBe('hidden');
  });

  it('stops listening when unmounted', () => {
    const { unmount } = renderTracker();
    act(flushFrame);
    unmount();

    scrollTo(500);
    expect(frames).toHaveLength(0);
  });
});
