import { describe, expect, it } from 'vitest';

import {
  COUNTRY_TILES,
  DECADE_TILES,
  DURATION_TILES,
  LANGUAGE_TILES,
  NETWORK_TILES,
  THEME_TILES,
} from './hubTiles';
import {
  buildDecadeTiles,
  buildDurationTiles,
  buildLinkTiles,
  countKey,
  durationDressIds,
  lineGlyphOf,
  wordmarkNetwork,
} from './lensModel';

const TMDB = 'https://image.tmdb.org/t/p';

describe('buildLinkTiles', () => {
  const counts = new Map([
    ['country:gb', 7240],
    ['query:with_origin_country=DK|SE', 1120],
  ]);
  const tiles = buildLinkTiles(COUNTRY_TILES, counts);

  it('links every tile to its landing, in the design order', () => {
    expect(tiles.map((tile) => [tile.name, tile.action])).toEqual([
      ['United Kingdom', { href: '/country/gb', kind: 'link' }],
      ['Germany', { href: '/country/de', kind: 'link' }],
      ['Spain', { href: '/country/es', kind: 'link' }],
      ['Denmark and Sweden', { href: '/country/dk', kind: 'link' }],
      ['All 60 countries', { href: '/country', kind: 'link' }],
    ]);
  });

  it('prints the count, or the hand-written line', () => {
    expect(tiles[0]?.line).toBe('7,240 series');
    expect(tiles[3]?.line).toBe('1,120 series');
    expect(tiles[4]?.line).toBe('By where a series is made');
    expect(tiles[4]?.look).toEqual({ kind: 'calm' });
  });

  it('leaves the line empty when a count is missing', () => {
    expect(tiles[1]?.line).toBe('');
  });

  it('dresses a tile with its show backdrop, or a deck of posters, with no API read', () => {
    expect(tiles[0]?.look).toEqual({
      image: `${TMDB}/w1920_and_h1080_multi_faces/8rvLEmdI4gLrMO1rLqbNdnNcPFE.jpg`,
      kind: 'backdrop',
      position: 'center 25%',
    });
    const bbcOne = buildLinkTiles(NETWORK_TILES, new Map())[3];
    expect(bbcOne?.look).toEqual({
      kind: 'deck',
      posters: [
        `${TMDB}/w300_and_h450_bestv2/vFn0nLPcIggPH5LTWWaJ2hcsGlc.jpg`,
        `${TMDB}/w300_and_h450_bestv2/1MccRnw41qQjREuZkovqP2UX1i3.jpg`,
        `${TMDB}/w300_and_h450_bestv2/pBAp7VfKVQKQIiLRJHZSMGtyXAB.jpg`,
      ],
    });
  });

  it('puts a network’s wordmark on its tile where one is known, the name stays', () => {
    const wordmark = {
      ratio: 2.5,
      silhouette: true,
      src: 'https://image.tmdb.org/t/p/w500/hbo.png',
    };
    const tiles = buildLinkTiles(
      NETWORK_TILES,
      new Map(),
      new Map([['/network/hbo', wordmark]]),
    );
    expect(tiles[1]).toMatchObject({ name: 'HBO', wordmark });
    expect(tiles[0]?.wordmark).toBeUndefined();
    expect(tiles[4]?.wordmark).toBeUndefined();
  });

  it('names the network of a network tile, for its wordmark', () => {
    expect(NETWORK_TILES.map(wordmarkNetwork)).toEqual([
      'apple-tv',
      'hbo',
      'netflix',
      'bbc-one',
      undefined,
    ]);
    expect(COUNTRY_TILES.map(wordmarkNetwork)).toEqual(
      COUNTRY_TILES.map(() => undefined),
    );
  });

  it('has art for every dressed tile', () => {
    const looks = [
      ...[COUNTRY_TILES, LANGUAGE_TILES, NETWORK_TILES, THEME_TILES].flatMap(
        (entries) => buildLinkTiles(entries, new Map()),
      ),
      ...buildDecadeTiles(DECADE_TILES, undefined),
    ].map((tile) => tile.look);
    for (const look of looks) {
      if (look.kind === 'backdrop') {
        expect(look.image).toMatch(
          /^https:\/\/image\.tmdb\.org\/t\/p\/.+\.jpg$/,
        );
      } else if (look.kind === 'deck') {
        expect(look.posters).toHaveLength(3);
        for (const poster of look.posters) {
          expect(poster).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\/.+\.jpg$/);
        }
      }
    }
  });
});

describe('buildDecadeTiles', () => {
  it('opens decades in place and counts Before 1990', () => {
    const tiles = buildDecadeTiles(DECADE_TILES, 2310);
    expect(tiles.map((tile) => tile.action)).toEqual([
      { kind: 'open', row: 'decade-2020s' },
      { kind: 'open', row: 'decade-2010s' },
      { kind: 'open', row: 'decade-2000s' },
      { kind: 'open', row: 'decade-1990s' },
      { kind: 'open', row: 'decade-before-1990' },
    ]);
    expect(tiles[1]?.line).toBe('Peak TV');
    expect(tiles[4]?.line).toBe('2,310 series');
  });
});

describe('buildDurationTiles', () => {
  it('puts the API tiles in the design order, dressed, Under 6 hours counted as miniseries', () => {
    const preview = [
      { backdrop: null, id: 1, poster: 'a' },
      { backdrop: 'b-bd', id: 2, poster: 'b' },
      { backdrop: null, id: 3, poster: 'c' },
    ];
    const tiles = buildDurationTiles(
      [
        { bucket: 'one-weekend', count: 2410, listed: 20, preview },
        { bucket: 'under-6-hours', count: 1104, listed: 20, preview },
      ],
      DURATION_TILES,
    );
    expect(tiles[0]).toMatchObject({
      action: { kind: 'open', row: 'duration-under-6-hours' },
      line: '1,104 miniseries',
      lineGlyph: 'layers',
      look: { image: 'b-bd', kind: 'backdrop' },
      name: 'Under 6 hours',
    });
    expect(tiles[1]).toMatchObject({
      line: '6 to 10 hours',
      lineGlyph: 'clock',
      look: { kind: 'deck', posters: ['a', 'b', 'c'] },
      name: 'One weekend',
    });
  });

  it('draws the calm icon, not a blank tile, when a preview has no art', () => {
    const tiles = buildDurationTiles(
      [
        { bucket: 'one-weekend', count: 10, listed: 20, preview: [] },
        { bucket: 'under-6-hours', count: 1104, listed: 20, preview: [] },
      ],
      DURATION_TILES,
    );
    expect(tiles.map((tile) => tile.look)).toEqual([
      { kind: 'calm' },
      { kind: 'calm' },
    ]);
  });
});

describe('buildDurationTiles: a tile needs a list to open', () => {
  it('leaves out a tile whose list holds under three shows; the others keep their order', () => {
    const preview = [{ backdrop: null, id: 1, poster: 'a' }];
    const tiles = buildDurationTiles(
      [
        { bucket: 'one-weekend', count: 2410, listed: 1, preview },
        { bucket: 'one-season', count: 900, listed: 2, preview },
        { bucket: 'complete-stories', count: 9870, listed: 20, preview },
        { bucket: 'under-6-hours', count: 1104, listed: 3, preview },
      ],
      DURATION_TILES,
    );
    expect(tiles.map((tile) => tile.name)).toEqual([
      'Under 6 hours',
      'Complete stories',
    ]);
  });
});

describe('buildDurationTiles: a deck needs three posters', () => {
  it('fans the three shows that have posters, skipping one without', () => {
    const preview = [
      { backdrop: null, id: 1, poster: 'a' },
      { backdrop: 'b-bd', id: 2, poster: null },
      { backdrop: null, id: 3, poster: 'c' },
      { backdrop: null, id: 4, poster: 'd' },
    ];
    const [tile] = buildDurationTiles(
      [{ bucket: 'one-weekend', count: 10, listed: 20, preview }],
      DURATION_TILES,
    );
    expect(tile?.look).toEqual({ kind: 'deck', posters: ['a', 'c', 'd'] });
    expect(durationDressIds(preview, 'deck')).toEqual([1, 3, 4]);
  });

  it('draws the calm tile, not a deck of one or two', () => {
    const preview = [
      { backdrop: null, id: 1, poster: 'a' },
      { backdrop: null, id: 2, poster: 'b' },
    ];
    const [tile] = buildDurationTiles(
      [{ bucket: 'one-season', count: 10, listed: 20, preview }],
      DURATION_TILES,
    );
    expect(tile?.look).toEqual({ kind: 'calm' });
    expect(durationDressIds(preview, 'deck')).toEqual([]);
  });
});

describe('durationDressIds', () => {
  it('names the shows a Duration tile draws, so its row can leave them out', () => {
    const preview = [
      { backdrop: null, id: 1, poster: 'a' },
      { backdrop: 'b-bd', id: 2, poster: 'b' },
      { backdrop: 'c-bd', id: 3, poster: 'c' },
      { backdrop: null, id: 4, poster: 'd' },
    ];
    expect(durationDressIds(preview, 'backdrop')).toEqual([2]);
    expect(durationDressIds(preview, 'deck')).toEqual([1, 2, 3]);
  });
});

describe('helpers', () => {
  it('reads a length line as time, anything else as a count', () => {
    expect(lineGlyphOf('6 to 10 hours')).toBe('clock');
    expect(lineGlyphOf('5+ seasons')).toBe('layers');
  });

  it('keys counts by landing or by query', () => {
    expect(countKey({ slug: 'gb', type: 'country' })).toBe('country:gb');
    expect(countKey({ query: 'with_origin_country=DK|SE' })).toBe(
      'query:with_origin_country=DK|SE',
    );
  });
});
