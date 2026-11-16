// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';

import getHistoryKey from './getHistoryKey';
import isBackNavigation from './isBackNavigation';
import { NAVIGATION_TRACKER_SCRIPT } from './NavigationTracker';

/** jsdom doesn't fire popstate on history.back(); do what the browser does. */
function goTo(state: unknown) {
  window.dispatchEvent(new PopStateEvent('popstate', { state }));
}

describe('navigation tracker', () => {
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
});
