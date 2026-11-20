// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import LiveCard from './LiveCard';

const props = {
  current: 'Top Boy',
  progress: 0.5,
  rate: 0.98,
  stopped: false,
  total: 1877,
};

describe('LiveCard', () => {
  it('says the count in words in its live region as it rolls', () => {
    const { rerender } = render(<LiveCard {...props} imported={917} />);
    rerender(<LiveCard {...props} imported={1204} />);
    const words = screen.getByText('1,204');
    expect(words.className).toContain('sr-only');
    expect(words.closest('[aria-live="polite"]')).toBeTruthy();
    expect(words.closest('[aria-hidden="true"]')).toBeNull();
  });
});
