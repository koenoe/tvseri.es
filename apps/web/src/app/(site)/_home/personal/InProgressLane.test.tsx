// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import InProgressLane from './InProgressLane';

// TileLink prefetches on intent
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ prefetch: () => {} }),
}));

afterEach(cleanup);

describe('Home’s In progress lane', () => {
  it('rolls its count as shows leave, reading the settled number to screen readers', () => {
    render(<InProgressLane count={12} items={[]} profileHref="/u/nina" />);
    const lane = screen.getByRole('region', { name: /In progress/ });
    expect(lane.querySelector('.sr-only')?.textContent).toBe('12');
    expect(
      lane.querySelector('[aria-hidden="true"].tabular-nums')?.textContent,
    ).toBe('12');
  });
});
