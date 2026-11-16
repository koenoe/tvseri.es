import type { Premiere, TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { withArtwork } from './premieres';

const premiere = (
  title: string,
  backdropImage: string,
  overrides: Partial<Premiere> = {},
): Premiere =>
  ({
    date: '2026-11-20',
    daysAway: 7,
    isBig: false,
    kind: 'season-premiere',
    release: null,
    seasonNumber: 2,
    series: { backdropImage, title } as TvSeries,
    ...overrides,
  }) as Premiere;

describe('withArtwork', () => {
  it('leaves out a premiere without its backdrop', () => {
    const { items, skippedCountdown } = withArtwork([
      premiere('Dept. Q', 'https://image.example.com/b.jpg'),
      premiere('No Art', ''),
    ]);
    expect(items.map((item) => item.series.title)).toEqual(['Dept. Q']);
    expect(skippedCountdown).toBeNull();
  });

  it('names a big premiere due for the Countdown that had no artwork', () => {
    const { skippedCountdown } = withArtwork([
      premiere('The Rookie', '', { daysAway: 2, isBig: true }),
    ]);
    expect(skippedCountdown).toBe('The Rookie');
  });

  it('does not name one too far off for the Countdown', () => {
    const { skippedCountdown } = withArtwork([
      premiere('Later', '', { daysAway: 10, isBig: true }),
    ]);
    expect(skippedCountdown).toBeNull();
  });
});
