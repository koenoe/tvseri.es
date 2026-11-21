// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { domAnimation, LazyMotion } from 'motion/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { eyeGlyph, refreshGlyph } from '@/components/ui/icon/glyphs';

import Button from './Button';

const tree = (ui: ReactElement) => (
  <LazyMotion features={domAnimation} strict>
    {ui}
  </LazyMotion>
);

const icon = () =>
  screen.getByRole('button').querySelector(':scope > svg') as SVGElement | null;

describe('Button’s icon', () => {
  it('turns into the pending ring and back in one swap', async () => {
    const button = (pending: boolean) =>
      tree(
        <Button icon={refreshGlyph} pending={pending}>
          Sync now
        </Button>,
      );
    const { rerender } = render(button(false));
    const idle = icon();
    rerender(button(true));
    // the ring spins inside its drawing
    await vi.waitFor(() =>
      expect(icon()?.querySelector('.animate-spin')).not.toBeNull(),
    );
    rerender(button(false));
    await vi.waitFor(() =>
      expect(icon()?.querySelector('.animate-spin')).toBeNull(),
    );
    expect(icon()).not.toBe(idle);
  });

  it('swaps a toggle glyph to its filled drawing when pressed', async () => {
    const { rerender } = render(
      tree(
        <Button icon={eyeGlyph} pressed={false}>
          Seen it
        </Button>,
      ),
    );
    const outline = icon();
    rerender(
      tree(
        <Button icon={eyeGlyph} pressed>
          Seen it
        </Button>,
      ),
    );
    await vi.waitFor(() => {
      expect(icon()).not.toBe(outline);
      expect(icon()).not.toBeNull();
    });
  });
});
