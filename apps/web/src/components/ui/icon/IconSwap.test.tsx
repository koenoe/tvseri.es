// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { domAnimation, LazyMotion, MotionGlobalConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { checkGlyph, copyGlyph, eyeGlyph } from './glyphs';
import IconSwap from './IconSwap';

const tree = (children: ReactNode) => (
  <LazyMotion features={domAnimation} strict>
    <button type="button">{children}</button>
  </LazyMotion>
);

/** The browser's next frames */
const frames = (count: number): Promise<void> =>
  new Promise((resolve) => {
    let left = count;
    const tick = () => {
      left -= 1;
      if (left === 0) {
        resolve();
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  });

const icons = () => screen.getByRole('button').querySelectorAll(':scope > svg');

describe('IconSwap', () => {
  // the pills pad and size a leading icon with `>svg` selectors
  it('draws the icon as the direct svg child, with Icon’s attributes', () => {
    render(tree(<IconSwap glyph={copyGlyph} size={16} />));
    const [svg] = icons();
    expect(svg?.getAttribute('width')).toBe('16');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('stroke')).toBe('currentColor');
  });

  it('does not animate the first icon in', () => {
    render(tree(<IconSwap glyph={copyGlyph} size={16} />));
    expect((icons()[0] as SVGElement).style.opacity).not.toBe('0');
  });

  it('keeps the same element while the icon stays the same', () => {
    const { rerender } = render(tree(<IconSwap glyph={eyeGlyph} size={16} />));
    const first = icons()[0];
    rerender(tree(<IconSwap glyph={eyeGlyph} size={16} />));
    expect(icons()[0]).toBe(first);
  });

  // a glyph from a server component arrives as a new object on each render
  it('keeps the same element for an equal glyph that is a new object', async () => {
    // a swap would finish within a frame: what's drawn then is the answer
    MotionGlobalConfig.skipAnimations = true;
    try {
      const { rerender } = render(
        tree(<IconSwap glyph={eyeGlyph} size={16} />),
      );
      const first = icons()[0];
      rerender(tree(<IconSwap glyph={{ ...eyeGlyph }} size={16} />));
      await act(() => frames(3));
      expect(icons()).toHaveLength(1);
      expect(icons()[0]).toBe(first);
    } finally {
      MotionGlobalConfig.skipAnimations = false;
    }
  });

  it('swaps on a new glyph and on a toggle glyph’s filled drawing', async () => {
    const { rerender } = render(tree(<IconSwap glyph={eyeGlyph} size={16} />));
    const outline = icons()[0];
    rerender(tree(<IconSwap active glyph={eyeGlyph} size={16} />));
    // the leaving icon goes first, then the filled one arrives in its place
    await vi.waitFor(() => {
      expect(icons()).toHaveLength(1);
      expect(icons()[0]).not.toBe(outline);
    });
    const filled = icons()[0];
    rerender(tree(<IconSwap active glyph={checkGlyph} size={16} />));
    await vi.waitFor(() => expect(icons()[0]).not.toBe(filled));
  });

  it('animates an icon away to nothing', async () => {
    const { rerender } = render(
      tree(<IconSwap glyph={checkGlyph} size={13} />),
    );
    rerender(tree(<IconSwap glyph={null} size={13} />));
    await vi.waitFor(() => expect(icons()).toHaveLength(0));
  });
});
