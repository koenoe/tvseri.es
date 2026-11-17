import type { TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { rankedShows } from './allTime';

const series = (id: number, poster = `https://img/p${id}.jpg`) =>
  ({
    firstAirDate: '2008-01-20',
    id,
    posterImage: poster,
    slug: `show-${id}`,
    title: `Show ${id}`,
  }) as TvSeries;

const ids = (count: number, from = 1) =>
  Array.from({ length: count }, (_, index) => series(from + index));

describe('rankedShows (Discover’s numbered All-time favourites)', () => {
  it('takes the first twenty in the list’s order, ranked 1 to 20', () => {
    const shows = rankedShows(ids(24));
    expect(shows).toHaveLength(20);
    expect(shows.map((show) => show.id)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(shows.map((show) => show.rank)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
  });

  it('skips a show without a poster: the next moves up and the ranks stay contiguous', () => {
    const list = [series(1), series(2, ''), series(3), ...ids(21, 4)];
    const shows = rankedShows(list);
    expect(shows).toHaveLength(20);
    expect(shows.slice(0, 3)).toMatchObject([
      { id: 1, rank: 1 },
      { id: 3, rank: 2 },
      { id: 4, rank: 3 },
    ]);
    expect(shows.at(-1)).toMatchObject({ id: 21, rank: 20 });
  });

  it('shows what there is when fewer than twenty have a poster', () => {
    const shows = rankedShows([...ids(5), series(6, ''), series(7, '')]);
    expect(shows.map((show) => show.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it('leaves the row out under three posters', () => {
    expect(rankedShows([series(1), series(2), series(3, '')])).toEqual([]);
  });

  it('keeps only what the tile draws', () => {
    expect(rankedShows(ids(3))[0]).toEqual({
      id: 1,
      poster: 'https://img/p1.jpg',
      rank: 1,
      slug: 'show-1',
      title: 'Show 1',
    });
  });

  it('keeps the first of a show the list names twice', () => {
    const shows = rankedShows([series(1), series(2), series(1), series(3)]);
    expect(shows.map((show) => show.id)).toEqual([1, 2, 3]);
  });
});
