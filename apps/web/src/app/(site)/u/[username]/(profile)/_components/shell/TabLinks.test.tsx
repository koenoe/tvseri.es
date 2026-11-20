// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ segment: null as string | null }));
vi.mock('next/navigation', () => ({
  useSelectedLayoutSegment: () => nav.segment,
}));

import TabLinks from './TabLinks';

const animate = vi.fn();

/** Each tab's box in the row (jsdom lays nothing out) */
const LEFT: Readonly<Record<string, number>> = {
  Calendar: 120,
  Circle: 480,
  History: 360,
  Library: 240,
  Overview: 0,
  Stats: 600,
};
const boxOf = (element: HTMLElement) => LEFT[element.textContent ?? ''];

beforeEach(() => {
  nav.segment = null;
  animate.mockReset();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: () => undefined,
      matches: false,
      removeEventListener: () => undefined,
    })),
  );
  Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
    configurable: true,
    get(this: HTMLElement) {
      return boxOf(this) ?? 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return boxOf(this) === undefined ? 0 : 110;
    },
  });
  HTMLElement.prototype.animate = animate;
  HTMLElement.prototype.scrollTo = () => undefined;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const tabs = () => (
  <nav>
    <div data-tab-scroller="">
      <TabLinks statsHref="/u/koen/stats/2026" username="koen" />
    </div>
  </nav>
);

describe('TabLinks', () => {
  it('draws the highlight in place on the first paint', () => {
    render(tabs());
    expect(animate).not.toHaveBeenCalled();
  });

  it('glides the highlight from the old tab to the one pressed', () => {
    const { rerender } = render(tabs());
    fireEvent.click(screen.getByRole('link', { name: 'Library' }));
    nav.segment = 'library';
    rerender(tabs());
    expect(animate).toHaveBeenCalledTimes(1);
    const [frames, options] = animate.mock.calls[0] ?? [];
    expect((frames as Keyframe[])[0]?.transform).toBe(
      'translateX(-240px) scaleX(1)',
    );
    expect(options).toMatchObject({ pseudoElement: '::before' });
  });

  it('jumps on Back or Forward: no press, no glide', () => {
    const { rerender } = render(tabs());
    nav.segment = 'history';
    rerender(tabs());
    expect(animate).not.toHaveBeenCalled();
  });
});
