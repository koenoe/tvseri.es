// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CheckBanner from './CheckBanner';

describe('CheckBanner', () => {
  it('points Edit columns at the panel only while it is open', () => {
    const props = {
      line: 'Netflix viewing activity',
      name: 'NetflixViewingHistory.csv',
      onToggle: vi.fn(),
      panelId: 'import-columns',
    };
    const { rerender } = render(<CheckBanner {...props} edit={false} />);
    const toggle = screen.getByRole('button', { name: 'Edit columns' });
    expect(toggle.hasAttribute('aria-controls')).toBe(false);

    rerender(<CheckBanner {...props} edit />);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-controls')).toBe('import-columns');
  });
});
