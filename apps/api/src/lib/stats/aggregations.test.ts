import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/detectDominantColorFromImage', () => ({
  detectDominantColorsFromImages: vi.fn(async () => new Map<string, string>()),
}));

import { aggregateProviders } from './aggregations';

const item = (
  seriesId: number,
  title: string,
  watchProviderName: string | null,
) => ({
  seriesId,
  title,
  watchProviderLogoPath: null,
  watchProviderName,
});

describe('aggregateProviders', () => {
  it('counts series per provider and names its top three by episodes', async () => {
    const stats = await aggregateProviders([
      item(1, 'Billions', 'Plex'),
      item(1, 'Billions', 'Plex'),
      item(1, 'Billions', 'Plex'),
      item(2, 'Barry', 'Plex'),
      item(2, 'Barry', 'Plex'),
      item(3, 'The Pitt', 'Plex'),
      item(4, 'Andor', 'Plex'),
      item(5, 'Adolescence', 'Netflix'),
      item(6, 'No provider', null),
    ]);

    expect(stats.map(({ count, name }) => ({ count, name }))).toEqual([
      { count: 4, name: 'Plex' },
      { count: 1, name: 'Netflix' },
    ]);
    expect(stats[0]?.series).toEqual([
      { id: 1, title: 'Billions' },
      { id: 2, title: 'Barry' },
      { id: 3, title: 'The Pitt' },
    ]);
    expect(stats[1]?.series).toEqual([{ id: 5, title: 'Adolescence' }]);
  });
});
