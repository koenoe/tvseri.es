import { describe, expect, it } from 'vitest';

import { bigKey, smallKeys } from './keys';
import type { RemoteEpisode } from './types';

/** The Bear, season 3. */
const BEAR: ReadonlyArray<RemoteEpisode> = [
  { episodeNumber: 5, seasonNumber: 3, still: '/e5.jpg', title: 'Children' },
  { episodeNumber: 6, seasonNumber: 3, still: '/e6.jpg', title: 'Napkins' },
  { episodeNumber: 7, seasonNumber: 3, still: null, title: 'Legacy' },
];

const E5 = { episodeNumber: 5, seasonNumber: 3 };

describe('bigKey', () => {
  it('shows the episode it will mark: still, code and title', () => {
    expect(bigKey({ episodes: BEAR, hasAired: true, nextEpisode: E5 })).toEqual(
      {
        disabled: false,
        episode: E5,
        label: 'Watched next episode',
        meta: 'S03E05 · Children',
        pending: false,
        still: '/e5.jpg',
      },
    );
  });

  it('moves on after a mark (E6 Napkins)', () => {
    const key = bigKey({
      episodes: BEAR,
      hasAired: true,
      nextEpisode: { episodeNumber: 6, seasonNumber: 3 },
    });
    expect(key.meta).toBe('S03E06 · Napkins');
    expect(key.still).toBe('/e6.jpg');
  });

  it('keeps the code alone and an empty still slot when the page has no data for it', () => {
    const key = bigKey({
      episodes: [],
      hasAired: true,
      nextEpisode: { episodeNumber: 1, seasonNumber: 4 },
    });
    expect(key.meta).toBe('S04E01');
    expect(key.still).toBeNull();
    const noStill = bigKey({
      episodes: BEAR,
      hasAired: true,
      nextEpisode: { episodeNumber: 7, seasonNumber: 3 },
    });
    expect(noStill.still).toBeNull();
    expect(noStill.meta).toBe('S03E07 · Legacy');
  });

  it('names the episode it is marking while pending, even after the store moved on', () => {
    const key = bigKey({
      episodes: BEAR,
      hasAired: true,
      // the optimistic store already says E6 is next
      nextEpisode: { episodeNumber: 6, seasonNumber: 3 },
      pending: E5,
    });
    expect(key).toMatchObject({
      label: 'Marking S03E05…',
      meta: 'S03E05 · Children',
      pending: true,
      still: '/e5.jpg',
    });
  });

  it('is disabled with its reason when the show is caught up and nothing is dated (Severance)', () => {
    expect(
      bigKey({
        episodes: [],
        hasAired: true,
        nextEpisode: null,
        nextToAir: { airDate: null, episodeNumber: 1, seasonNumber: 3 },
      }),
    ).toEqual({
      disabled: true,
      episode: null,
      label: 'Watched next episode',
      meta: 'All caught up · Season 3 has no date yet',
      pending: false,
      still: null,
    });
  });

  it('says when the next one airs if it has a date', () => {
    const key = bigKey({
      episodes: [],
      hasAired: true,
      nextEpisode: null,
      nextToAir: { airDate: '2027-07-02', episodeNumber: 6, seasonNumber: 3 },
    });
    expect(key.meta).toBe('All caught up · S03E06 airs Jul 2, 2027');
  });

  it('is plainly caught up for an ended show', () => {
    expect(
      bigKey({ episodes: [], hasAired: true, nextEpisode: null }).meta,
    ).toBe('All caught up');
  });

  it('is disabled before anything has aired (production hid the item)', () => {
    const key = bigKey({
      episodes: [],
      hasAired: false,
      nextEpisode: { episodeNumber: 1, seasonNumber: 1 },
      nextToAir: { airDate: '2027-03-03', episodeNumber: 1, seasonNumber: 1 },
    });
    expect(key.disabled).toBe(true);
    expect(key.meta).toBe('Not aired yet · S01E01 airs Mar 3, 2027');
  });
});

describe('bigKey before the show is seeded (a tile)', () => {
  it('waits, signed in, until it can name the episode it marks', () => {
    expect(
      bigKey({
        episodes: [],
        hasAired: true,
        nextEpisode: undefined,
        resolving: true,
      }),
    ).toMatchObject({ disabled: true, episode: null, pending: true });
  });

  it('stays pressable signed out: a press asks to sign in', () => {
    expect(
      bigKey({ episodes: BEAR, hasAired: true, nextEpisode: undefined }),
    ).toEqual({
      disabled: false,
      episode: null,
      label: 'Watched next episode',
      meta: '',
      pending: false,
      still: null,
    });
  });

  it('says it is marking while the server answers', () => {
    expect(
      bigKey({
        episodes: BEAR,
        hasAired: true,
        nextEpisode: undefined,
        pending: 'next',
      }),
    ).toMatchObject({ label: 'Marking…', pending: true });
  });
});

describe('smallKeys', () => {
  it('show page: E, F, W with production wording, the toggles unlatched by default', () => {
    expect(smallKeys('show', null)).toEqual([
      { id: 'history', label: 'Edit watch history', shortcut: 'E' },
      {
        checked: false,
        id: 'favorites',
        label: 'Add to favourites',
        shortcut: 'F',
      },
      {
        checked: false,
        id: 'watchlist',
        label: 'Add to watchlist',
        shortcut: 'W',
      },
    ]);
  });

  it('latches and flips the label when on (F latched)', () => {
    const [, favorites, watchlist] = smallKeys('show', {
      isFavorited: true,
      isWatchlisted: true,
    });
    expect(favorites).toMatchObject({
      checked: true,
      label: 'Remove from favourites',
    });
    expect(watchlist).toMatchObject({
      checked: true,
      label: 'Remove from watchlist',
    });
  });

  it('in progress tile: E and H (Hide instead of the two lists)', () => {
    expect(smallKeys('tile', null)).toEqual([
      { id: 'history', label: 'Edit watch history', shortcut: 'E' },
      { id: 'hide', label: 'Hide from in progress', shortcut: 'H' },
    ]);
  });

  it('a hidden show’s tile: H latched, bringing it back', () => {
    expect(smallKeys('tile', null, { hidden: true })[1]).toEqual({
      checked: true,
      id: 'hide',
      label: 'Hidden from in progress',
      shortcut: 'H',
    });
  });
});
