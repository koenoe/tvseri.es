// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { AnimatePresence } from 'motion/react';
import { describe, expect, it, vi } from 'vitest';

import FoldPresence from './FoldPresence';
import MotionProvider from './MotionProvider';

const fold = (open: boolean) => (
  <MotionProvider>
    <AnimatePresence initial={false}>
      {open ? (
        <FoldPresence key="part">
          <span>Part</span>
        </FoldPresence>
      ) : null}
    </AnimatePresence>
  </MotionProvider>
);

const box = () => screen.getByText('Part').parentElement as HTMLElement;

describe('FoldPresence', () => {
  it('draws at rest unclipped, so a focus ring or a shadow is never cut', () => {
    render(fold(true));
    expect(box().className).not.toContain('overflow-hidden');
  });

  it('clips while it folds open, then lets go once it has', async () => {
    const { rerender } = render(fold(false));
    rerender(fold(true));
    await vi.waitFor(() =>
      expect(box().className).toContain('overflow-hidden'),
    );
    await vi.waitFor(
      () => expect(box().className).not.toContain('overflow-hidden'),
      { timeout: 2000 },
    );
  });

  it('clips while it folds shut', () => {
    const { rerender } = render(fold(true));
    rerender(fold(false));
    expect(box().className).toContain('overflow-hidden');
  });
});
