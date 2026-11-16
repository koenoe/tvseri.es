// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ProgressHole from './ProgressHole';

vi.mock('../../_data/viewerSeed', () => ({
  getViewerSeed: vi.fn(async () => ({
    seed: { seasons: [], seriesId: 1 },
    signedIn: false,
  })),
}));
vi.mock('../../_data/loaders', () => ({
  loadRuntimes: vi.fn(async () => ({})),
}));
vi.mock('@/lib/marking/SeedSeries', () => ({ default: () => null }));
vi.mock('./ProgressBar', () => ({
  default: ({ signedIn }: Readonly<{ signedIn: boolean }>) => (
    <button type="button">{signedIn ? 'progress' : 'size'}</button>
  ),
}));

describe('ProgressHole', () => {
  it('draws the line signed out too, in its signed-out form', async () => {
    render(
      await ProgressHole({
        series: { id: 1, nextEpisodeToAir: null, seasons: [] },
      }),
    );
    expect(screen.getByRole('button', { name: 'size' })).toBeTruthy();
  });
});
