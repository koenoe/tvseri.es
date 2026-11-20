// @vitest-environment jsdom

import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RollingCount from './RollingCount';

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: () => undefined,
      matches: false,
      removeEventListener: () => undefined,
    })),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

/** What a screen reader reads: everything but the aria-hidden roll */
const spoken = (container: HTMLElement) => {
  const copy = container.cloneNode(true) as HTMLElement;
  for (const hidden of copy.querySelectorAll('[aria-hidden="true"]')) {
    hidden.remove();
  }
  return copy.textContent;
};

describe('RollingCount', () => {
  it('says the new count at once while the drawn one rolls to it', () => {
    const { container, rerender } = render(<RollingCount value={1203} />);
    expect(spoken(container)).toBe('1,203');
    rerender(<RollingCount value={1250} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(spoken(container)).toBe('1,250');
    const drawn = container.querySelector('[aria-hidden="true"]');
    expect(drawn?.textContent).not.toBe('1,250');
  });
});
