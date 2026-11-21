// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { domAnimation, LazyMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import MarkSwap from './MarkSwap';

const tree = (children: ReactNode) => (
  <LazyMotion features={domAnimation} strict>
    <button type="button">{children}</button>
  </LazyMotion>
);

describe('MarkSwap', () => {
  it('swaps any mark by its key', async () => {
    const { rerender } = render(tree(<MarkSwap swapKey="1">1</MarkSwap>));
    expect(screen.getByRole('button').textContent).toBe('1');
    rerender(tree(<MarkSwap swapKey="done">✓</MarkSwap>));
    await vi.waitFor(() =>
      expect(screen.getByRole('button').textContent).toBe('✓'),
    );
  });

  it('animates a mark away to nothing', async () => {
    const { rerender } = render(tree(<MarkSwap swapKey="ring">◌</MarkSwap>));
    rerender(tree(<MarkSwap swapKey="none">{null}</MarkSwap>));
    await vi.waitFor(() =>
      expect(screen.getByRole('button').textContent).toBe(''),
    );
  });
});
