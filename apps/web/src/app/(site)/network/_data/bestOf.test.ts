import { describe, expect, it } from 'vitest';

import { bestOf } from './bestOf';

const option = (
  key: string,
  label: string,
  filter: Record<string, string>,
) => ({
  count: 40,
  filter,
  key,
  label,
});

describe('bestOf', () => {
  it('switches by decade when the facts say decades (HBO)', () => {
    expect(
      bestOf({
        kind: 'decades',
        options: [
          option('before-2010', 'Before 2010', {
            'first_air_date.lte': '2009-12-31',
          }),
          option('2010s', '2010s', { 'first_air_date.gte': '2010-01-01' }),
        ],
      }),
    ).toEqual({
      kind: 'tabs',
      label: 'By decade',
      tabs: [
        {
          filter: { 'first_air_date.lte': '2009-12-31' },
          key: 'before-2010',
          label: 'Before 2010',
        },
        {
          filter: { 'first_air_date.gte': '2010-01-01' },
          key: '2010s',
          label: '2010s',
        },
      ],
    });
  });

  it('switches by genre otherwise (Apple TV), in the facts order', () => {
    const result = bestOf({
      kind: 'genres',
      options: [
        option('drama', 'Drama', { with_genres: '18' }),
        option('comedy', 'Comedy', { with_genres: '35' }),
        option('sci-fi-fantasy', 'Sci-Fi & Fantasy', { with_genres: '10765' }),
      ],
    });
    expect(result.kind).toBe('tabs');
    expect(result.kind === 'tabs' && result.label).toBe('By genre');
    expect(result.kind === 'tabs' && result.tabs.map((tab) => tab.key)).toEqual(
      ['drama', 'comedy', 'sci-fi-fantasy'],
    );
  });

  it('is one plain row with fewer than two options', () => {
    expect(bestOf({ kind: 'genres', options: [] })).toEqual({ kind: 'plain' });
    expect(
      bestOf({
        kind: 'genres',
        options: [option('drama', 'Drama', { with_genres: '18' })],
      }),
    ).toEqual({ kind: 'plain' });
  });
});
