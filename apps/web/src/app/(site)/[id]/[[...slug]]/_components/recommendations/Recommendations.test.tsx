// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RecommendationsRow } from './Recommendations';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('../../_data/loaders', () => ({
  loadRecommendations: vi.fn(async () => ({ unavailable: true })),
}));

describe('Recommendations', () => {
  it('draws the shared failed row (not the loading skeleton) when Unavailable', async () => {
    render(await RecommendationsRow({ seriesId: 1 }));
    expect(screen.getByRole('alert').textContent).toContain(
      'Recommendations didn’t load.',
    );
    expect(
      screen.getByRole('region', { name: 'Recommendations' }).ariaBusy,
    ).not.toBe('true');
    screen.getByRole('button', { name: 'Try again' }).click();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
