// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SortSwitch from './SortSwitch';

const animate = vi.fn();

const noop = () => undefined;

beforeEach(() => {
  animate.mockReset();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      addEventListener: () => undefined,
      matches: false,
      removeEventListener: () => undefined,
    })),
  );
  HTMLElement.prototype.animate = animate;
});

const sort = (value: 'hours' | 'watched') => (
  <SortSwitch onChange={noop} onIntent={noop} value={value} />
);

describe('SortSwitch', () => {
  it('is a row of toggle buttons, the order on screen pressed', () => {
    render(sort('watched'));
    const pressed = screen.getByRole('button', { name: 'In order watched' });
    expect(pressed.getAttribute('aria-pressed')).toBe('true');
    expect(animate).not.toHaveBeenCalled();
  });

  it('glides the fill to the order chosen', () => {
    const { rerender } = render(sort('watched'));
    rerender(sort('hours'));
    const [, options] = animate.mock.calls[0] ?? [];
    expect(options).toMatchObject({ pseudoElement: '::before' });
  });
});
