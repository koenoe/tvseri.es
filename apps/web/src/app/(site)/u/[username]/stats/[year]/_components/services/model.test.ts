import { describe, expect, it } from 'vitest';

import {
  buildServices,
  isStoreProvider,
  type ProviderInput,
  seriesLine,
} from './model';

const names = (...titles: string[]) =>
  titles.map((title, id) => ({ id, title }));

describe('isStoreProvider', () => {
  it('knows the stores where a show is bought', () => {
    expect(isStoreProvider('Apple TV')).toBe(true);
    expect(isStoreProvider('Google Play Movies')).toBe(true);
    expect(isStoreProvider('Amazon Video')).toBe(true);
    expect(isStoreProvider('Microsoft Store')).toBe(true);
  });
  it('does not mistake a subscription for one', () => {
    expect(isStoreProvider('Apple TV+')).toBe(false);
    expect(isStoreProvider('Apple TV Plus')).toBe(false);
    expect(isStoreProvider('Prime Video')).toBe(false);
    expect(isStoreProvider('Netflix')).toBe(false);
  });
});

describe('seriesLine', () => {
  it('lists up to three names and says how many more', () => {
    expect(seriesLine(names('Billions', 'Barry', 'The Pitt'), 33)).toBe(
      'Billions, Barry, The Pitt and 30 more',
    );
  });
  it('names everything when it fits', () => {
    expect(seriesLine(names('The Traitors', 'Celebrity Traitors'), 2)).toBe(
      'The Traitors, Celebrity Traitors',
    );
  });
  it('counts the rest of two names', () => {
    expect(seriesLine(names('A', 'B'), 5)).toBe('A, B and 3 more');
  });
  it('is absent without names', () => {
    expect(seriesLine(undefined, 5)).toBeNull();
    expect(seriesLine([], 5)).toBeNull();
  });
});

describe('buildServices', () => {
  const provider = (
    name: string,
    count: number,
    extra: Partial<ProviderInput> = {},
  ): ProviderInput => ({
    count,
    defaultColor: '#000',
    logo: `${name}.png`,
    name,
    ...extra,
  });
  const listed = [
    { id: 1, logo: 'netflix.png', name: 'Netflix' },
    { id: 2, logo: 'paramount.png', name: 'Paramount+' },
    { id: 3, logo: 'sky.png', name: 'Sky Go' },
  ];
  const result = buildServices(
    [
      provider('Netflix', 30),
      provider('Plex', 33, {
        series: [{ id: 1, title: 'Billions' }],
      }),
      provider('BBC iPlayer', 6),
      provider('Apple TV', 2),
    ],
    listed,
    2025,
  );

  it('orders used services by shows and sizes bars against the top one', () => {
    expect(result.used.map((row) => [row.name, row.bar])).toEqual([
      ['Plex', 100],
      ['Netflix', 90.9],
      ['BBC iPlayer', 18.2],
      ['Apple TV', 6.1],
    ]);
  });

  it('badges the count of used services', () => {
    expect(result.count).toBe(4);
  });

  it('says where each one stands against the profile’s services', () => {
    expect(result.used.map((row) => row.status)).toEqual([
      'plex',
      'listed',
      'unlisted',
      'unlisted',
    ]);
  });

  it('matches by name, ignoring case', () => {
    expect(
      buildServices([provider('netflix', 3)], listed, 2025).used[0]?.status,
    ).toBe('listed');
  });

  it('writes the line: series, or bought for a store', () => {
    expect(result.used.map((row) => row.line)).toEqual([
      'Billions and 32 more',
      null,
      null,
      'Bought, not streamed',
    ]);
  });

  it('labels counts as shows', () => {
    expect(result.used.map((row) => row.shows)).toEqual([
      '33 series',
      '30 series',
      '6 series',
      '2 series',
    ]);
    expect(
      buildServices([provider('Prime Video', 1)], [], 2025).used[0]?.shows,
    ).toBe('1 series');
  });

  it('keeps listed services that were not used, dimmed, in listed order', () => {
    expect(result.unused).toEqual([
      {
        key: 'Paramount+',
        line: 'Nothing logged in 2025',
        logo: 'paramount.png',
        name: 'Paramount+',
      },
      {
        key: 'Sky Go',
        line: 'Nothing logged in 2025',
        logo: 'sky.png',
        name: 'Sky Go',
      },
    ]);
  });
});

describe('seriesLine fitting the column', () => {
  it('names fewer shows when three don’t fit, so nothing clips', () => {
    expect(
      seriesLine(names('Adolescence', 'Dept. Q', 'Black Rabbit'), 30),
    ).toBe('Adolescence, Dept. Q and 28 more');
    expect(seriesLine(names('The Studio', 'The Morning Show'), 4)).toBe(
      'The Studio and 3 more',
    );
  });
});
