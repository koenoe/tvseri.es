// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import RowScrollRestore from './RowScrollRestore';

type NavWindow = Window & { __navIsBack?: boolean };

/** What NavigationTracker leaves behind: a key per entry and the direction. */
function onEntry(key: string, { back }: Readonly<{ back: boolean }>) {
  window.history.replaceState({ key }, '');
  (window as NavWindow).__navIsBack = back;
}

function mountRow(restoreKey: string) {
  const view = render(
    <>
      <ul id="rail" />
      <RowScrollRestore railId="rail" restoreKey={restoreKey} />
    </>,
  );
  const rail = view.container.querySelector('ul')!;
  return { rail, unmount: view.unmount };
}

/** The user scrolls the row, then navigates away. */
function leaveScrolledTo(restoreKey: string, scrollLeft: number) {
  const { rail, unmount } = mountRow(restoreKey);
  rail.scrollLeft = scrollLeft;
  rail.dispatchEvent(new Event('scroll'));
  unmount();
}

describe('RowScrollRestore', () => {
  beforeEach(() => {
    onEntry('entry-a', { back: false });
  });

  it('restores the offset when the user comes back to the entry', () => {
    leaveScrolledTo('top-picks', 488);
    onEntry('entry-a', { back: true });
    expect(mountRow('top-picks').rail.scrollLeft).toBe(488);
  });

  it('starts at 0 on a forward navigation', () => {
    leaveScrolledTo('hidden-gems', 488);
    onEntry('entry-a', { back: false });
    expect(mountRow('hidden-gems').rail.scrollLeft).toBe(0);
  });

  it('keeps one offset per history entry', () => {
    leaveScrolledTo('premieres', 488);
    onEntry('entry-b', { back: true });
    expect(mountRow('premieres').rail.scrollLeft).toBe(0);
  });

  it('keeps one offset per row', () => {
    leaveScrolledTo('recommendations', 488);
    onEntry('entry-a', { back: true });
    expect(mountRow('watchlist').rail.scrollLeft).toBe(0);
  });
});
