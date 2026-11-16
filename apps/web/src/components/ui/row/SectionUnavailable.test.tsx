// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SectionUnavailable from './SectionUnavailable';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

describe('SectionUnavailable with the section’s placeholder', () => {
  it('keeps the placeholder under the card, settled and out of the tree, so a late failure moves nothing', () => {
    const { container } = render(
      <SectionUnavailable
        id="spotlight"
        placeholder={<div data-testid="stage" style={{ height: 860 }} />}
        title="Trending this week"
      />,
    );
    const stage = screen.getByTestId('stage');
    const holder = stage.parentElement;
    expect(holder?.getAttribute('aria-hidden')).toBe('true');
    expect(holder?.hasAttribute('inert')).toBe(true);
    // the failed slots are settled (no pulse); they pulse again while it retries
    expect(holder?.parentElement?.className).toContain('[&_*]:animate-none');
    // not a tile row: no row region with dashed slots
    expect(container.querySelector('.border-dashed')).toBeNull();
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Trending this week didn’t load.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('without a placeholder stays the row error (a tile row’s own failed look)', () => {
    render(<SectionUnavailable id="hidden-gems" title="Hidden gems" />);
    expect(screen.getByRole('region', { name: 'Hidden gems' })).toBeTruthy();
  });
});
