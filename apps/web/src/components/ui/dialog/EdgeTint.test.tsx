// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import EdgeTint, { tintEdges } from './EdgeTint';

/** A dialog with a panel whose ground and offset jsdom can't compute */
function dialogWith(background: string, offsetTop: number) {
  const dialog = document.createElement('dialog');
  const panel = document.createElement('div');
  panel.style.backgroundColor = background;
  Object.defineProperty(panel, 'offsetTop', { value: offsetTop });
  dialog.append(panel);
  document.body.append(dialog);
  return { dialog, panel };
}

describe('tintEdges', () => {
  it('a bottom sheet tints the bottom edge only', () => {
    const { dialog, panel } = dialogWith('rgb(255, 255, 255)', 400);
    tintEdges(panel);
    expect(dialog.style.getPropertyValue('--edge-tint-bottom')).toBe(
      'rgb(255, 255, 255)',
    );
    expect(dialog.style.getPropertyValue('--edge-tint-top')).toBe('');
  });

  it('a full-screen panel tints both edges', () => {
    const { dialog, panel } = dialogWith('rgb(47, 42, 36)', 0);
    tintEdges(panel);
    expect(dialog.style.getPropertyValue('--edge-tint-top')).toBe(
      'rgb(47, 42, 36)',
    );
    expect(dialog.style.getPropertyValue('--edge-tint-bottom')).toBe(
      'rgb(47, 42, 36)',
    );
  });
});

describe('EdgeTint', () => {
  it('draws two inert, unpainted strips Safari can read', () => {
    const { container } = render(<EdgeTint className="sm:hidden" />);
    const strips = container.querySelectorAll('[data-edge-tint]');
    expect(strips).toHaveLength(2);
    for (const strip of strips) {
      expect(strip.getAttribute('aria-hidden')).toBe('true');
      expect(strip.className).toContain('pointer-events-none');
      expect(strip.className).toContain('fixed');
      expect(strip.className).toContain('sm:hidden');
    }
  });
});
