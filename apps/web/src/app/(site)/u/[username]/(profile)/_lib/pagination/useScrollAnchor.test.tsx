// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import useScrollAnchor from './useScrollAnchor';

const ROW = 100;

/**
 * jsdom has no layout: each row's top is its index times 100px, less what
 * the window has scrolled, so a row added above pushes the rest down
 */
let scrolled = 0;
function layOut(list: HTMLElement) {
  [...list.children].forEach((row, index) => {
    vi.spyOn(row, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          bottom: index * ROW + ROW - scrolled,
          top: index * ROW - scrolled,
        }) as DOMRect,
    );
  });
}

let capture: () => void = () => {};

function List({ ids }: Readonly<{ ids: ReadonlyArray<number> }>) {
  const ref = useRef<HTMLUListElement>(null);
  capture = useScrollAnchor(ref, ids);
  return (
    <ul ref={ref}>
      {ids.map((id) => (
        <li key={id}>{id}</li>
      ))}
    </ul>
  );
}

afterEach(() => {
  scrolled = 0;
  vi.restoreAllMocks();
});

describe('useScrollAnchor', () => {
  it('scrolls by what the first visible item moved when items land above', () => {
    const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    const { container, rerender } = render(<List ids={[5, 6, 7, 8]} />);
    const list = container.querySelector('ul') as HTMLElement;
    // the reader is 150px down: row 6 is the first one on screen
    scrolled = 150;
    layOut(list);
    capture();
    // React lays out the new rows during the commit; mock it before the effect
    const insertBefore = list.insertBefore.bind(list);
    vi.spyOn(list, 'insertBefore').mockImplementation((node, child) => {
      const inserted = insertBefore(node, child);
      layOut(list);
      return inserted;
    });
    rerender(<List ids={[2, 3, 4, 5, 6, 7, 8]} />);
    expect(scrollBy).toHaveBeenCalledWith({ behavior: 'instant', top: 300 });
  });

  it('does nothing on a commit it was not asked to hold', () => {
    const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    const { rerender } = render(<List ids={[5, 6]} />);
    rerender(<List ids={[5, 6, 7]} />);
    expect(scrollBy).not.toHaveBeenCalled();
  });
});
