// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import StatsUnavailable from './StatsUnavailable';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => {} }),
}));

afterEach(cleanup);

describe('StatsUnavailable', () => {
  it('draws the card over the section’s own placeholder, so the section keeps its size', () => {
    render(
      <StatsUnavailable
        id="stats-tiles"
        placeholder={<div data-testid="tiles-ghost" style={{ height: 212 }} />}
        title="Totals"
      />,
    );
    expect(screen.getByText('Totals didn’t load.')).toBeTruthy();
    const ghost = screen.getByTestId('tiles-ghost');
    // the ghost stays in the flow, out of reach of assistive tech
    expect(ghost.closest('[inert]')).not.toBeNull();
  });
});
