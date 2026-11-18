// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CareerTouch from './CareerTouch';

const rows = (
  <CareerTouch>
    <a data-career-row="" href="/1">
      One
    </a>
    <a data-career-row="" href="/2">
      Two
    </a>
  </CareerTouch>
);

const tap = (element: Element) => {
  fireEvent.pointerDown(element, { pointerType: 'touch' });
  fireEvent.click(element);
};

/** Capture `pointerdown` listeners on the document, added minus removed */
const outsideListeners = (
  add: ReturnType<typeof vi.spyOn>,
  remove: ReturnType<typeof vi.spyOn>,
) => {
  const isOurs = (call: unknown[]) =>
    call[0] === 'pointerdown' && call[2] === true;
  return (
    add.mock.calls.filter(isOurs).length -
    remove.mock.calls.filter(isOurs).length
  );
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CareerTouch', () => {
  it('one document listener while rows are lit, gone on unmount', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(rows);
    tap(screen.getByText('One'));
    tap(screen.getByText('Two'));
    expect(screen.getByText('Two').hasAttribute('data-hot')).toBe(true);
    expect(screen.getByText('One').hasAttribute('data-hot')).toBe(false);
    expect(outsideListeners(add, remove)).toBe(1);
    unmount();
    expect(outsideListeners(add, remove)).toBe(0);
  });

  it('a tap outside lets the row go and removes the listener', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    render(rows);
    tap(screen.getByText('One'));
    fireEvent.pointerDown(document.body);
    expect(screen.getByText('One').hasAttribute('data-hot')).toBe(false);
    expect(outsideListeners(add, remove)).toBe(0);
  });
});
