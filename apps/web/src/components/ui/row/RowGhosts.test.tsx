// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import RowGhosts, { GHOST_LOOK, GhostLine } from './RowGhosts';

const pulsing = (container: HTMLElement) =>
  container.querySelectorAll('.animate-ghost').length;

describe('RowGhosts', () => {
  it('pulses a loading row once, on its rail, not per slot', () => {
    const { container } = render(<RowGhosts caption="meta" look="loading" />);
    expect(pulsing(container)).toBe(1);
    expect(container.firstElementChild?.className).toContain('animate-ghost');
  });

  it('keeps a failed row static', () => {
    const { container } = render(<RowGhosts caption="meta" look="failed" />);
    expect(pulsing(container)).toBe(0);
  });

  it('gives a loose ghost line its own pulse while loading', () => {
    const { container } = render(
      <GhostLine className="h-5" look="loading" width="w-1/2" />,
    );
    expect(pulsing(container)).toBe(1);
    expect(GHOST_LOOK.failed).not.toContain('animate');
  });
});
