// @vitest-environment jsdom

import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RollingNumber from './RollingNumber';

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
  vi.useFakeTimers({
    toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
  reducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('RollingNumber', () => {
  it('draws its first value grouped, out of a screen reader’s way', () => {
    const { container } = render(<RollingNumber value={1203} />);
    const number = container.firstElementChild;
    expect(number?.textContent).toBe('1,203');
    expect(number?.getAttribute('aria-hidden')).toBe('true');
  });

  it('rolls through the numbers between to the new value in 400ms', () => {
    const { container, rerender } = render(<RollingNumber value={0} />);
    rerender(<RollingNumber value={100} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    const midway = Number(container.textContent);
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(100);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(container.textContent).toBe('100');
  });

  it('jumps with reduced motion', () => {
    reducedMotion(true);
    const { container, rerender } = render(<RollingNumber value={0} />);
    rerender(<RollingNumber value={100} />);
    expect(container.textContent).toBe('100');
  });
});
