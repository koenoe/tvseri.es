import type { NetflixViewedItem } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { netflixRow } from './netflixRow';

const EPISODE: NetflixViewedItem = {
  date: 1_763_000_000_000,
  episodeTitle: 'Chapter One: The Hellfire Club',
  movieID: 81_000_001,
  seasonDescriptor: 'Stranger Things 4',
  series: 80_057_281,
  seriesTitle: 'Stranger Things',
  title: 'Chapter One: The Hellfire Club',
};

describe('netflixRow', () => {
  it('reads an episode from its separate show, season and episode fields', () => {
    expect(netflixRow(EPISODE, 3)).toEqual({
      kind: 'episode',
      row: {
        episode: 'Chapter One: The Hellfire Club',
        index: 3,
        season: 'Stranger Things 4',
        title: 'Stranger Things',
        watchedAt: 1_763_000_000_000,
        watchProvider: 'Netflix',
      },
    });
  });

  it('counts an entry without a series as a film', () => {
    expect(
      netflixRow(
        { date: 1, movieID: 70_000_001, title: 'Roma' } as NetflixViewedItem,
        0,
      ),
    ).toEqual({ kind: 'film' });
  });

  it('splits the combined title when the show title is missing', () => {
    expect(
      netflixRow(
        {
          date: 5,
          movieID: 1,
          series: 2,
          title: 'Dark: Season 1: Secrets',
        } as NetflixViewedItem,
        0,
      ),
    ).toEqual({
      kind: 'episode',
      row: {
        episode: 'Secrets',
        index: 0,
        season: 'Season 1',
        title: 'Dark',
        watchedAt: 5,
        watchProvider: 'Netflix',
      },
    });
  });

  it('takes a show with no season label as "any season"', () => {
    const { row } = netflixRow(
      { ...EPISODE, seasonDescriptor: undefined },
      0,
    ) as Extract<ReturnType<typeof netflixRow>, { kind: 'episode' }>;
    expect(row.season).toBe('');
  });

  it('treats a series flag of true like a series id', () => {
    expect(netflixRow({ ...EPISODE, series: true }, 0).kind).toBe('episode');
  });

  it('counts an entry without a show or an episode name with the films, never as a nameless show', () => {
    const shapes: ReadonlyArray<NetflixViewedItem> = [
      // No show title, and the title is the episode alone
      { date: 1, movieID: 1, series: 2, title: 'Episode 3' },
      { date: 1, movieID: 1, series: 2, seriesTitle: '', title: 'Episode 3' },
      { date: 1, movieID: 1, series: 2, title: 'Season 1: Pilot' },
      { ...EPISODE, seriesTitle: '   ' },
      // A show without an episode
      { date: 1, movieID: 1, series: 2, title: 'Dark' },
      { ...EPISODE, episodeTitle: '', title: '' },
    ];
    for (const shape of shapes) {
      expect(netflixRow(shape, 0)).toEqual({ kind: 'film' });
    }
  });
});
