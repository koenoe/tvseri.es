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
const cancel = vi.fn();

/** A glide as the browser reports it: running at an eased `progress`, or done */
function glideAt(progress: number | null) {
  return {
    cancel,
    effect: { getComputedTiming: () => ({ progress }) },
    playState: progress === null ? 'finished' : 'running',
  };
}

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
  animate.mockImplementation(() => glideAt(null));
  cancel.mockReset();
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

  it('glides on from where the pill is drawn when picked again mid-glide', () => {
    const { rerender } = render(<Nav active="watching" />);
    pick();
    // watching (38) → finished (122): a quarter of the way (eased) when
    // watchlist (80) is picked, so the pill is drawn at 122 - 84 * 0.75 = 59
    animate.mockImplementationOnce(() => glideAt(0.25));
    rerender(<Nav active="finished" />);
    pick();
    rerender(<Nav active="watchlist" />);
    expect(glides()).toEqual(['translateY(-84px)', 'translateY(-21px)']);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('glides from where the old row is at the press, after the rows moved', () => {
    const { rerender } = render(<Nav active="watching" />);
    // a row opened above watching since it was drawn (a fold, a shelf)
    const tops = { ...TOPS, watching: 60 };
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
      configurable: true,
      get(this: HTMLElement) {
        return tops[this.dataset.shelf as keyof typeof tops] ?? 0;
      },
    });
    pick();
    rerender(<Nav active="finished" />);
    expect(glides()).toEqual(['translateY(-62px)']);
  });

  it('hands out the same pick on every render', () => {
    const { rerender } = render(<Nav active="watching" />);
    const first = pick;
    rerender(<Nav active="finished" />);
    expect(pick).toBe(first);
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
