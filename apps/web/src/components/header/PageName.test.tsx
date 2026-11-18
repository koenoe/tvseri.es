// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PageName from './PageName';
import { usePageNameStore } from './pageNameStore';

type Callback = (
  entries: ReadonlyArray<Partial<IntersectionObserverEntry>>,
) => void;

let callback: Callback = () => {};
let rootMargin: string | undefined;
const disconnect = vi.fn();

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(run: Callback, options?: IntersectionObserverInit) {
        callback = run;
        rootMargin = options?.rootMargin;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  usePageNameStore.getState().set(null, false);
});

const see = (entry: Partial<IntersectionObserverEntry>) =>
  act(() => callback([entry]));

describe('PageName', () => {
  it('sets the page name and follows the title leaving the top of the screen', () => {
    render(<PageName name="Crime" />);
    expect(usePageNameStore.getState().name).toBe('Crime');
    expect(usePageNameStore.getState().titleAway).toBe(false);

    see({
      boundingClientRect: { top: -20 } as DOMRectReadOnly,
      isIntersecting: false,
    });
    expect(usePageNameStore.getState().titleAway).toBe(true);

    see({
      boundingClientRect: { top: 80 } as DOMRectReadOnly,
      isIntersecting: true,
    });
    expect(usePageNameStore.getState().titleAway).toBe(false);
  });

  it('watches the line under the 64px phone bar', () => {
    render(<PageName name="Crime" />);
    expect(rootMargin).toBe('-64px 0px 0px 0px');
  });

  // A finger scroll moves a few px a frame: the title leaves the watched
  // area just under the bar's line, still on screen behind the bar
  it('a title that just slid under the bar is away', () => {
    render(<PageName name="Crime" />);
    see({
      boundingClientRect: { top: 62 } as DOMRectReadOnly,
      isIntersecting: false,
    });
    expect(usePageNameStore.getState().titleAway).toBe(true);
  });

  it('a title still below the screen is not away', () => {
    render(<PageName name="Crime" />);
    see({
      boundingClientRect: { top: 2000 } as DOMRectReadOnly,
      isIntersecting: false,
    });
    expect(usePageNameStore.getState().titleAway).toBe(false);
  });

  it('clears the name when the page goes, but not one that replaced it', () => {
    const first = render(<PageName name="Crime" />);
    const second = render(<PageName name="Drama" />);
    first.unmount();
    expect(usePageNameStore.getState().name).toBe('Drama');
    second.unmount();
    expect(usePageNameStore.getState().name).toBeNull();
    expect(disconnect).toHaveBeenCalled();
  });
});
