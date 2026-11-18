// @vitest-environment jsdom
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';

import getHistoryKey from './getHistoryKey';
import isBackNavigation from './isBackNavigation';
import { NAVIGATION_TRACKER_SCRIPT } from './NavigationTracker';

/** jsdom doesn't fire popstate on history.back(); do what the browser does. */
function goTo(state: unknown) {
  window.dispatchEvent(new PopStateEvent('popstate', { state }));
}

describe('navigation tracker', () => {
  // jsdom has no scrolling: a page change's scroll lands here
  let scrollTo: MockInstance<typeof window.scrollTo>;

  beforeEach(() => {
    scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    scrollTo.mockRestore();
  });

  // Once per page, like the browser: the script patches history and adds a
  // popstate listener that can't be removed again.
  beforeAll(() => {
    // biome-ignore lint/security/noGlobalEval: runs the inline script as the browser would
    window.eval(NAVIGATION_TRACKER_SCRIPT);
  });

  it('gives every history entry its own key, kept by replaceState', () => {
    const first = getHistoryKey();
    expect(first).not.toBe('index');
    window.history.pushState(null, '', '/1396/breaking-bad');
    const second = getHistoryKey();
    expect(second).not.toBe(first);
    window.history.replaceState({ other: true }, '');
    expect(getHistoryKey()).toBe(second);
  });

  it('knows a back navigation from a forward one', () => {
    const start = window.history.state;
    window.history.pushState(null, '', '/discover');
    expect(isBackNavigation()).toBe(false);
    const discover = window.history.state;
    window.history.pushState(null, '', '/genre/crime');

    window.history.replaceState(discover, '');
    goTo(discover);
    expect(isBackNavigation()).toBe(true);

    window.history.replaceState(start, '');
    goTo(start);
    expect(isBackNavigation()).toBe(true);

    window.history.replaceState(discover, '');
    goTo(discover);
    expect(isBackNavigation()).toBe(false);
  });

  describe('scroll on a page change', () => {
    /** The scroll waits for the rest of the commit (a microtask) */
    const settle = () => Promise.resolve();

    beforeEach(async () => {
      window.history.replaceState(null, '', '/discover');
      await settle();
      scrollTo.mockClear();
    });

    it('opens a new page at the top, after the commit that writes its URL', async () => {
      window.history.pushState(null, '', '/1396/breaking-bad');
      expect(scrollTo).not.toHaveBeenCalled();
      await settle();
      expect(scrollTo).toHaveBeenCalledOnce();
      expect(scrollTo).toHaveBeenCalledWith({
        behavior: 'instant',
        left: 0,
        top: 0,
      });
    });

    it('opens a page that replaces the entry at the top too', async () => {
      window.history.replaceState(null, '', '/settings/profile');
      await settle();
      expect(scrollTo).toHaveBeenCalledOnce();
    });

    it('leaves the scroll alone when only the query changes', async () => {
      window.history.pushState(null, '', '/discover?episode=3');
      window.history.replaceState(null, '', '/discover?season=2');
      window.history.pushState({ overlay: true }, '');
      await settle();
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it("leaves a link to an anchor to Next's own scroll", async () => {
      window.history.pushState(null, '', '/privacy#cookies');
      await settle();
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('leaves Back and Forward to the restored position', async () => {
      window.history.pushState(null, '', '/genre/crime');
      await settle();
      scrollTo.mockClear();
      window.history.back();
      await vi.waitFor(() =>
        expect(window.location.pathname).toBe('/discover'),
      );
      // the router writes the entry it restored, at the URL the browser moved to
      window.history.replaceState(window.history.state, '', '/discover');
      await settle();
      expect(scrollTo).not.toHaveBeenCalled();
    });
  });
});
