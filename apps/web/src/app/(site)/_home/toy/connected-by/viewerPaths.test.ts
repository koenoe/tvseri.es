import type { ConnectedPath, LibraryIds, TvSeries } from '@tvseri.es/schemas';
import { rotationIndex } from '@tvseri.es/utils';
import { describe, expect, it } from 'vitest';

import { endOf, startOf, unseenPaths, viewerStart } from './viewerPaths';

const show = (id: number) =>
  ({ id, slug: `show-${id}`, title: `Show ${id}` }) as TvSeries;

const person = (id: number) => ({
  characters: ['a', 'b'],
  id,
  image: '',
  name: `Person ${id}`,
  slug: `person-${id}`,
});

const path = (start: number, bridge: number, end: number): ConnectedPath => ({
  nodes: [
    { series: show(start), type: 'show' },
    { person: person(start * 10), type: 'person' },
    { series: show(bridge), type: 'show' },
    { person: person(bridge * 10), type: 'person' },
    { series: show(end), type: 'show' },
  ],
  steps: 2,
});

const EMPTY: LibraryIds = {
  favorites: [],
  inProgress: [],
  watched: [],
  watchlist: [],
};

const DAY = '2026-11-17';

describe('viewerStart', () => {
  it('starts from a finished show, a different one each day', () => {
    const watched = [11, 12, 13, 14];
    const ids = { ...EMPTY, favorites: [21], watched };

    expect(viewerStart(ids, DAY)).toBe(
      watched[rotationIndex(DAY, watched.length, 'connected-start')],
    );
    expect(viewerStart(ids, '2026-11-18')).not.toBe(viewerStart(ids, DAY));
  });

  it('falls back to a favourite, then a show in progress, then none', () => {
    expect(
      viewerStart({ ...EMPTY, favorites: [21], inProgress: [31] }, DAY),
    ).toBe(21);
    expect(viewerStart({ ...EMPTY, inProgress: [31] }, DAY)).toBe(31);
    expect(viewerStart(EMPTY, DAY)).toBeUndefined();
  });
});

describe('unseenPaths', () => {
  const paths = [
    path(1, 2, 100),
    path(1, 3, 101),
    path(1, 2, 102),
    path(1, 4, 103),
    path(1, 3, 104),
  ];

  it('keeps the first three paths whose end is in none of the viewer’s lists', () => {
    const ids: LibraryIds = {
      favorites: [],
      inProgress: [101],
      watched: [],
      watchlist: [103],
    };

    expect(unseenPaths(paths, ids).map((p) => endOf(p)?.id)).toEqual([
      100, 102, 104,
    ]);
  });

  it('leaves a path out for its end only, never for the shows on the way', () => {
    const ids: LibraryIds = { ...EMPTY, watched: [1, 2, 3, 4] };

    expect(unseenPaths(paths, ids).map((p) => endOf(p)?.id)).toEqual([
      100, 101, 102,
    ]);
  });

  it('has nothing left when the viewer has every end', () => {
    const ids: LibraryIds = {
      favorites: [100],
      inProgress: [101],
      watched: [102, 103],
      watchlist: [104],
    };

    expect(unseenPaths(paths, ids)).toEqual([]);
  });
});

describe('startOf and endOf', () => {
  it('name the first and the last show of a path', () => {
    expect(startOf(path(1, 2, 3))?.id).toBe(1);
    expect(endOf(path(1, 2, 3))?.id).toBe(3);
  });
});
