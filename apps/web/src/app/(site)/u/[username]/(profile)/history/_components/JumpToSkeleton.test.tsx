// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JumpToGhosts } from './JumpToSkeleton';

describe('JumpToGhosts (Jump to’s placeholder)', () => {
  it('draws five years, the first open at the months so far', () => {
    const { container } = render(<JumpToGhosts months={11} />);
    const years = container.querySelectorAll('.h-9');
    const months = container.querySelectorAll('.h-\\[30px\\]');
    expect(years).toHaveLength(5);
    expect(months).toHaveLength(11);
    // the months sit under the first year, before the others
    expect(years[0]?.nextElementSibling?.contains(months[0] ?? null)).toBe(
      true,
    );
  });

  it('has This week in the owner’s variant only', () => {
    const { container } = render(<JumpToGhosts months={1} />);
    const week = container.querySelector('[data-ghost="week"]');
    expect(week?.closest('.ph-owner')).toBeTruthy();
    expect(container.querySelector('.ph-visitor')?.childElementCount).toBe(0);
  });
});
