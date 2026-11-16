// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RowArrows from './RowArrows';

/** A full row at 1440: twelve 220px posters, 24px gaps, the 112px gutter. */
function mountRow({ posters = 12 }: Readonly<{ posters?: number }> = {}) {
  const view = render(
    <>
      <RowArrows railId="rail" title="Top Picks for November" />
      <ul id="rail" style={{ paddingLeft: '112px' }}>
        {Array.from({ length: posters }, (_, i) => (
          <li key={i} />
        ))}
      </ul>
    </>,
  );
  const rail = view.container.querySelector('ul')!;
  const scrollWidth = 112 + posters * 244 - 24 + 112;
  Object.defineProperties(rail, {
    clientWidth: { value: 1440 },
    scrollWidth: { value: scrollWidth },
  });
  rail.querySelectorAll('li').forEach((li, i) => {
    Object.defineProperties(li, {
      offsetLeft: { value: 112 + i * 244 },
      offsetWidth: { value: 220 },
    });
  });
  const scrollTo = vi.fn();
  rail.scrollTo = scrollTo;
  // the rail is measured once it has a size: what its ResizeObserver reports
  act(() => resized());
  return { rail, rerender: view.rerender, scrollTo };
}

let resized: () => void = () => {};
let observed: Element[] = [];

function scrollRailTo(rail: HTMLElement, scrollLeft: number) {
  rail.scrollLeft = scrollLeft;
  act(() => {
    rail.dispatchEvent(new Event('scroll'));
  });
}

const previous = () =>
  screen.getByRole('button', { name: 'Previous: Top Picks for November' });
const next = () =>
  screen.getByRole('button', { name: 'Next: Top Picks for November' });

describe('RowArrows', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resized = callback;
          observed = [];
        }
        observe(element: Element) {
          observed.push(element);
        }
        disconnect() {}
      },
    );
  });

  it('watches the rail and each item (a widening item overflows the rail)', () => {
    const { rail } = mountRow();
    expect(observed).toEqual([rail, ...Array.from(rail.children)]);
  });

  it('names both arrows after the row and points them at the rail', () => {
    mountRow();
    expect(previous().getAttribute('aria-controls')).toBe('rail');
    expect(next().getAttribute('aria-controls')).toBe('rail');
  });

  it('dims Previous at the start and Next at the end', () => {
    const { rail } = mountRow();
    expect(previous().getAttribute('aria-disabled')).toBe('true');
    expect(next().getAttribute('aria-disabled')).toBe('false');

    scrollRailTo(rail, 1220);
    expect(previous().getAttribute('aria-disabled')).toBe('false');
    expect(next().getAttribute('aria-disabled')).toBe('false');

    scrollRailTo(rail, 1688);
    expect(previous().getAttribute('aria-disabled')).toBe('false');
    expect(next().getAttribute('aria-disabled')).toBe('true');
  });

  it('renders no arrows for a row that fits', () => {
    mountRow({ posters: 5 });
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('pages smoothly to the cut-off card', () => {
    const { scrollTo } = mountRow();
    fireEvent.click(next());
    expect(scrollTo).toHaveBeenCalledWith({ behavior: 'smooth', left: 1220 });
  });

  it('pages smoothly back to the start', () => {
    const { rail, scrollTo } = mountRow();
    scrollRailTo(rail, 1220);
    fireEvent.click(previous());
    expect(scrollTo).toHaveBeenCalledWith({ behavior: 'smooth', left: 0 });
  });

  it('jumps instead of scrolling smoothly when reduced motion is asked for', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      addEventListener: () => {},
      matches: query === '(prefers-reduced-motion: reduce)',
      removeEventListener: () => {},
    }));
    try {
      const { scrollTo } = mountRow();
      fireEvent.click(next());
      expect(scrollTo).toHaveBeenCalledWith({
        behavior: 'instant',
        left: 1220,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('ignores a dimmed arrow but keeps it focusable', () => {
    const { scrollTo } = mountRow();
    previous().focus();
    fireEvent.click(previous());
    expect(scrollTo).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(previous());
  });
});
