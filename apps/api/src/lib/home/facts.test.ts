import type { TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { factDeck } from './facts';

const show = (id: number, extra: Partial<TvSeries> = {}) =>
  ({
    firstAirDate: '2008-01-20',
    id,
    lastAirDate: '2013-09-29',
    lastEpisodeToAir: { runtime: 47 },
    numberOfEpisodes: 62,
    status: 'Ended',
    ...extra,
  }) as TvSeries;

/** Running: no years fact */
const running = (id: number) =>
  show(id, { lastAirDate: '', status: 'Returning Series' });

const types = (shows: ReadonlyArray<TvSeries>) =>
  factDeck(shows).map((fact) => fact.type);

describe('factDeck', () => {
  it('four ended shows: every type, neighbours differ, the wrap too', () => {
    expect(types([show(1), show(2), show(3), show(4)])).toEqual([
      'hours',
      'episodes',
      'years',
      'episodes',
    ]);
  });

  it('no years to tell: hours and episodes take turns', () => {
    expect(types([running(1), running(2), running(3), running(4)])).toEqual([
      'hours',
      'episodes',
      'hours',
      'episodes',
    ]);
  });

  it('a years fact needs two years or more on air', () => {
    const short = show(1, { firstAirDate: '2012-01-01' });
    expect(types([show(1), show(2), short])).toEqual([
      'hours',
      'episodes',
      'hours',
    ]);
  });

  // The wrap (last to first) is best effort: three running shows can't
  // alternate two types round a circle
  it('neighbours never share a type, at any mix of shows', () => {
    const kinds = [show, running];
    for (let size = 2; size <= 4; size++) {
      for (let mix = 0; mix < 2 ** size; mix++) {
        const deck = Array.from({ length: size }, (_, i) =>
          kinds[(mix >> i) & 1]!(i),
        );
        const picked = types(deck);
        picked.slice(1).forEach((type, i) => {
          expect(type).not.toBe(picked[i]);
        });
      }
    }
  });

  it('keeps the values: hours rounded, episodes, years', () => {
    expect(
      factDeck([show(1), show(2), show(3)]).map(({ type, value }) => ({
        type,
        value,
      })),
    ).toEqual([
      { type: 'hours', value: 49 },
      { type: 'episodes', value: 62 },
      { type: 'years', value: 5 },
    ]);
  });

  it('one show, or none', () => {
    expect(types([show(1)])).toEqual(['hours']);
    expect(factDeck([])).toEqual([]);
  });
});
