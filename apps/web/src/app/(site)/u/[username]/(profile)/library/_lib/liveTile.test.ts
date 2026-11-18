import { describe, expect, it } from 'vitest';

import type { SeriesBase } from '@/lib/marking/types';
import type { TileView } from '@/lib/profile/tileView';
import { liveWatchingTile } from './liveTile';

const TILE: TileView = {
  addedAt: 1,
  code: 'S01E02',
  hasAired: true,
  heart: false,
  historySeason: 1,
  id: 7,
  initial: 'b',
  line: { aired: 50, watched: 10 },
  meta: [{ kind: 'plain', text: '4 to go' }],
  on: {
    favourite: false,
    finished: false,
    hidden: false,
    watching: true,
    watchlist: false,
  },
  posterImage: '',
  slug: 'the-bear',
  title: 'The Bear',
  undated: false,
};

const view = (watched: ReadonlyArray<string>): SeriesBase => ({
  prefs: null,
  seasons: [
    { airedEpisodeCount: 0, episodeCount: 2, seasonNumber: 0 },
    { airedEpisodeCount: 4, episodeCount: 4, seasonNumber: 1 },
    { airedEpisodeCount: 0, episodeCount: 6, seasonNumber: 2 },
  ],
  seriesId: 7,
  skipped: [],
  status: null,
  watched: Object.fromEntries(
    watched.map((code) => [code, { runtime: 30, watchedAt: 1 }]),
  ),
});

describe('liveWatchingTile', () => {
  it('moves the code, what is left and the line after a mark', () => {
    const tile = liveWatchingTile(TILE, view(['S01E01', 'S01E02']));
    expect(tile.code).toBe('S01E03');
    expect(tile.meta).toEqual([{ kind: 'plain', text: '2 to go' }]);
    // 10 regular episodes, 4 aired, 2 watched (specials never count)
    expect(tile.line).toEqual({ aired: 40, watched: 20 });
  });

  it('is up to date with everything aired watched', () => {
    const tile = liveWatchingTile(
      TILE,
      view(['S01E01', 'S01E02', 'S01E03', 'S01E04']),
    );
    expect(tile.code).toBeNull();
    expect(tile.meta[0]?.text).toBe('Up to date');
  });

  it('keeps the airing wording', () => {
    const airing = {
      ...TILE,
      meta: [{ kind: 'plain', text: '3 new · airing' }] as const,
    };
    expect(liveWatchingTile(airing, view(['S01E01'])).meta[0]?.text).toBe(
      '3 new · airing',
    );
  });
});
