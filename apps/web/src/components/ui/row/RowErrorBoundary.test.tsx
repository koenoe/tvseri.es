// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import RowErrorBoundary from './RowErrorBoundary';

function Broken(): never {
  throw new Error('read failed');
}

describe('RowErrorBoundary around a section that isn’t a tile row', () => {
  it('fails at its placeholder’s size, settled and out of the tree, under the card', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <RowErrorBoundary
        id="weekend"
        placeholder={<div data-testid="stage" style={{ height: 475 }} />}
        title="Finish it this weekend"
      >
        <Broken />
      </RowErrorBoundary>,
    );
    const holder = screen.getByTestId('stage').parentElement;
    expect(holder?.getAttribute('aria-hidden')).toBe('true');
    expect(holder?.hasAttribute('inert')).toBe(true);
    // not a row of dashed poster slots
    expect(container.querySelector('.border-dashed')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain(
      'Finish it this weekend didn’t load.',
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('without a placeholder is the row error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <RowErrorBoundary id="essentials" title="Essentials">
        <Broken />
      </RowErrorBoundary>,
    );
    expect(screen.getByRole('region', { name: 'Essentials' })).toBeTruthy();
  });
});
