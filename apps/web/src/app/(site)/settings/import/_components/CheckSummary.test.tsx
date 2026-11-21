// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CheckSummary from './CheckSummary';

const props = {
  checking: null,
  episodes: 1834,
  failed: false,
  lines: [
    { count: '18 rows', key: 'top boy', title: 'Top Boy', why: 'Two series' },
  ],
  notCounted: '',
  onToggle: vi.fn(),
  rows: 2554,
  unmatched: 43,
};

describe('CheckSummary', () => {
  it('points Show at the list only while the list is there', () => {
    const { rerender } = render(<CheckSummary {...props} open={false} />);
    const toggle = screen.getByRole('button', { name: 'Show' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.hasAttribute('aria-controls')).toBe(false);

    rerender(<CheckSummary {...props} open />);
    const controls = toggle.getAttribute('aria-controls');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls!)?.textContent).toContain(
      'Top Boy',
    );
  });
});
