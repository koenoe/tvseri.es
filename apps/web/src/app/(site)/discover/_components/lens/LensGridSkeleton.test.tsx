// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LensGridSkeleton, { LensGridFailed } from './LensGridSkeleton';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe('lens grid placeholders', () => {
  it('is busy while the tiles load', () => {
    const { container } = render(<LensGridSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('says the lens didn’t load, statically, when its tiles are unavailable', () => {
    const { container } = render(<LensGridFailed title="Duration" />);
    expect(screen.getByText('Duration didn’t load.')).toBeTruthy();
    expect(container.querySelector('[aria-busy]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(container.querySelectorAll('.border-dashed')).toHaveLength(5);
  });
});
