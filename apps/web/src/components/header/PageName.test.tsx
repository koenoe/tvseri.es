// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PageName from './PageName';
import { usePageNameStore } from './pageNameStore';

type Callback = (
  entries: ReadonlyArray<Partial<IntersectionObserverEntry>>,
) => void;

let callback: Callback = () => {};
const disconnect = vi.fn();

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(run: Callback) {
        callback = run;
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
