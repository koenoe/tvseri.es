import type { Feature, Toy, TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { featureShowIds, toyShowIds } from './momentShows';

const show = (id: number) => ({ id }) as TvSeries;

describe('featureShowIds', () => {
  it('lists every show the Binge calculator offers', () => {
    const feature = {
      episodeRuntime: 50,
      kind: 'binge',
      numberOfEpisodes: 26,
      series: show(1),
      shows: [2, 3].map((id) => ({
        episodeRuntime: 50,
        numberOfEpisodes: 10,
        seasons: [10],
        series: show(id),
        totalMinutes: 500,
      })),
      totalMinutes: 1300,
    } as Feature;
    expect(featureShowIds(feature)).toEqual([1, 2, 3]);
  });

  it('lists the Countdown’s premieres', () => {
    const feature = {
      kind: 'countdown',
      premieres: [{ series: show(7) }, { series: show(8) }],
    } as unknown as Feature;
    expect(featureShowIds(feature)).toEqual([7, 8]);
  });
});

describe('toyShowIds', () => {
  it('lists the shows in a Connected by chain, not the people', () => {
    const toy = {
      kind: 'connected-by',
      paths: [
        {
          nodes: [
            { series: show(1), type: 'show' },
            { person: { id: 50 }, type: 'person' },
            { series: show(2), type: 'show' },
          ],
          steps: 1,
        },
      ],
    } as unknown as Toy;
    expect(toyShowIds(toy)).toEqual([1, 2]);
  });
});
