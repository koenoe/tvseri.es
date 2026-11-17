// @vitest-environment jsdom

import { act, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePillGlide } from './usePillGlide';

/** Each shelf's row top within the nav (jsdom lays nothing out) */
const TOPS: Readonly<Record<string, number>> = {
  finished: 122,
  watching: 38,
  watchlist: 80,
};
const SHELVES = Object.keys(TOPS);

let pick: () => void = () => undefined;

function Nav({ active }: Readonly<{ active: string }>) {
  const nav = useRef<HTMLElement>(null);
  pick = usePillGlide(nav, active);
  return (
    <nav ref={nav}>
      {SHELVES.map((shelf) => (
        <a data-shelf={shelf} href={`#${shelf}`} key={shelf}>
          {shelf === active ? <span data-pill /> : null}
        </a>
      ))}
    </nav>
  );
}

const animate = vi.fn();

function reducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: () => undefined,
      matches,
      removeEventListener: () => undefined,
    })),
  );
}

beforeEach(() => {
  animate.mockReset();
  reducedMotion(false);
  Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
    configurable: true,
    get(this: HTMLElement) {
      return TOPS[this.dataset.shelf ?? ''] ?? 0;
    },
  });
  HTMLElement.prototype.animate = animate;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The pill's start offset in each glide */
const glides = () =>
  animate.mock.calls.map(([frames]) => (frames as Keyframe[])[0]?.transform);

describe('usePillGlide', () => {
  it('stays put on the first render', () => {
    render(<Nav active="watching" />);
    expect(animate).not.toHaveBeenCalled();
  });

  it('glides a picked shelf from the old row, measured within the nav', () => {
    const { rerender } = render(<Nav active="watching" />);
    pick();
    rerender(<Nav active="finished" />);
    expect(glides()).toEqual(['translateY(-84px)']);
    pick();
    rerender(<Nav active="watchlist" />);
    expect(glides()).toEqual(['translateY(-84px)', 'translateY(42px)']);
  });

  it('puts the pill on its row after Back or Forward', () => {
    const { rerender } = render(<Nav active="watching" />);
    rerender(<Nav active="finished" />);
    pick();
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    rerender(<Nav active="watchlist" />);
    expect(animate).not.toHaveBeenCalled();
  });

  it('jumps with reduced motion', () => {
    reducedMotion(true);
    const { rerender } = render(<Nav active="watching" />);
    pick();
    rerender(<Nav active="finished" />);
    expect(animate).not.toHaveBeenCalled();
  });
});
