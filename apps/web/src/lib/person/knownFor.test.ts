import type { Movie, PersonShow, TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { buildKnownFor, type KnownForTile } from './knownFor';

const tv = (id: number, title: string, voteCount = 0, popularity = 0) =>
  ({
    firstAirDate: '2008-01-20',
    id,
    popularity,
    posterImage: `https://image.tmdb.org/${id}.jpg`,
    slug: title.toLowerCase().replaceAll(' ', '-'),
    title,
    voteCount,
  }) as TvSeries;

const film = {
  id: 9,
  popularity: 10,
  posterImage: 'https://image.tmdb.org/trumbo.jpg',
  releaseDate: '2015-09-12',
  slug: 'trumbo',
  title: 'Trumbo',
  voteCount: 1200,
} as Movie;

const credit = (
  id: number,
  name: string,
  episodeCount: number,
  characters: string[],
  voteCount = 0,
  popularity = 0,
): PersonShow => ({
  characters,
  episodeCount,
  id,
  isCast: true,
  isCrew: false,
  isGuest: episodeCount <= 1,
  isVoice: false,
  jobs: [],
  name,
  popularity,
  posterImage: `https://image.tmdb.org/${id}.jpg`,
  role: characters.join(' / '),
  slug: name.toLowerCase().replaceAll(' ', '-'),
  voteCount,
});

describe('buildKnownFor', () => {
  const shows = [
    credit(1396, 'Breaking Bad', 62, ['Walter White'], 16_000),
    credit(2004, 'Malcolm in the Middle', 151, ['Hal'], 4_000),
    credit(1400, 'Seinfeld', 7, ['Tim Whatley'], 3_500),
    credit(5, 'Guest Spot', 1, ['Doctor'], 90_000),
  ];

  it('fills TMDB known-for with his other shows, films included', () => {
    const tiles = buildKnownFor([tv(1396, 'Breaking Bad'), film], shows);
    expect(tiles.map((tile) => tile.title)).toEqual([
      'Breaking Bad',
      'Malcolm in the Middle',
      'Seinfeld',
      'Trumbo',
    ]);
    expect(tiles[0]).toMatchObject({
      href: '/1396/breaking-bad',
      line1: 'Walter White',
      line2: '62 episodes',
    });
    expect(tiles.at(-1)).toEqual({
      aria: 'Trumbo, Film, 2015',
      id: 9,
      line1: 'Film',
      line2: '2015',
      poster: 'https://image.tmdb.org/trumbo.jpg',
      title: 'Trumbo',
    });
  });

  it('keeps five', () => {
    expect(
      buildKnownFor(
        [tv(1, 'A'), tv(2, 'B'), tv(3, 'C'), tv(4, 'D'), tv(6, 'E'), film],
        [],
      ),
    ).toHaveLength(5);
  });

  it('writes a crew-only credit as Shows does: "Executive producer", not TMDB’s "Executive Producer"', () => {
    const producer: PersonShow = {
      ...credit(500, 'The Night Desk', 8, []),
      isCast: false,
      isCrew: true,
      jobs: ['Executive Producer'],
      role: 'Executive Producer',
    };
    const [tile] = buildKnownFor([tv(500, 'The Night Desk')], [producer]);
    expect(tile?.line1).toBe('Executive producer');
  });
});

describe('Known for ranks by how widely seen the work is', () => {
  // A prolific actor: a long soap and a daytime show with hundreds of
  // episodes, one hit drama, a miniseries, a cult comedy, a film
  const career = [
    credit(10, 'Harbour Lane', 2_150, ['Dr. Ray Morgan'], 420, 60),
    credit(11, 'Morning Desk', 310, ['Co-host'], 35, 12),
    credit(12, 'The Long Night', 62, ['Detective Hale'], 15_800, 90),
    credit(13, 'Ashfall', 6, ['Mara'], 9_100, 40),
    credit(14, 'Office Hours', 22, ['Benny'], 2_900, 25),
    credit(15, 'One Night Only', 1, ['Waiter'], 50_000, 300),
  ];
  const famousFilm = { ...film, voteCount: 5_400 } as Movie;

  it('puts the most-voted work first, films included, never by episode count', () => {
    const tiles = buildKnownFor(
      [tv(12, 'The Long Night', 15_800, 90), famousFilm],
      career,
    );
    expect(tiles.map((tile) => tile.title)).toEqual([
      'The Long Night',
      'Ashfall',
      'Trumbo',
      'Office Hours',
      'Harbour Lane',
    ]);
  });

  it('falls back to popularity when the votes tie', () => {
    const tiles = buildKnownFor(
      [],
      [
        credit(20, 'Quiet One', 10, ['A'], 0, 5),
        credit(21, 'Loud One', 10, ['B'], 0, 80),
      ],
    );
    expect(tiles.map((tile) => tile.title)).toEqual(['Loud One', 'Quiet One']);
  });

  it('breaks a full tie the same way whatever the order it came in', () => {
    const a = credit(31, 'Alpha', 4, ['A'], 100, 10);
    const b = credit(30, 'Beta', 4, ['B'], 100, 10);
    const forward = buildKnownFor([], [a, b]).map((tile) => tile.id);
    const backward = buildKnownFor([], [b, a]).map((tile) => tile.id);
    expect(forward).toEqual([30, 31]);
    expect(backward).toEqual(forward);
  });
});

describe('Known for keeps the role a person is known for', () => {
  const titles = (tiles: ReadonlyArray<KnownForTile>) =>
    tiles.map((tile) => tile.title);
  const movie = (id: number, title: string, voteCount: number) =>
    ({ ...film, id, slug: title, title, voteCount }) as Movie;
  const crewCredit = (
    id: number,
    name: string,
    episodeCount: number,
    voteCount: number,
  ): PersonShow => ({
    ...credit(id, name, episodeCount, [], voteCount),
    isCast: false,
    isCrew: true,
    isGuest: false,
    jobs: ['Director'],
    role: 'Director',
  });

  it('a long lead beats a two-episode voice part and a directed episode (Bryan Cranston)', () => {
    const tiles = buildKnownFor(
      [
        tv(1396, 'Breaking Bad', 16_000),
        movie(64690, 'Drive', 13_000),
        movie(399174, 'Isle of Dogs', 5_000),
      ],
      [
        credit(1396, 'Breaking Bad', 62, ['Walter White'], 16_000),
        credit(2004, 'Malcolm in the Middle', 151, ['Hal'], 2_200),
        credit(1813, 'Clerks', 2, ['Various (voice)'], 3_000),
        crewCredit(1880, 'Big Day', 1, 1_500),
      ],
    );
    expect(titles(tiles)).toEqual([
      'Breaking Bad',
      'Drive',
      'Isle of Dogs',
      'Malcolm in the Middle',
      'Clerks',
    ]);
  });

  it('the lead of a mid-size show beats guest spots on giants', () => {
    const tiles = buildKnownFor(
      [],
      [
        credit(1, 'Giant Sitcom', 2, ['Neighbour'], 9_000),
        credit(2, 'Giant Drama', 2, ['Lawyer'], 8_000),
        credit(3, 'Harbour Town', 40, ['Sheriff Dunn'], 3_000),
      ],
    );
    expect(titles(tiles)[0]).toBe('Harbour Town');
  });

  it('a voice lead of a long cartoon stays first; a voiced film keeps its votes', () => {
    const tiles = buildKnownFor(
      [movie(50, 'Rabbit Road', 4_000)],
      [
        credit(60, 'Back Yard Gang', 300, ['Skip (voice)'], 5_000),
        credit(61, 'Huge Cartoon', 2, ['Guest (voice)'], 20_000),
      ],
    );
    expect(titles(tiles)).toEqual([
      'Back Yard Gang',
      'Rabbit Road',
      'Huge Cartoon',
    ]);
  });

  it('a director: the films, then the show he directed most of, then one episode of a giant', () => {
    const tiles = buildKnownFor(
      [movie(70, 'Night Train', 6_000), movie(71, 'Cold Harbour', 2_500)],
      [
        crewCredit(80, 'Giant Thriller', 1, 20_000),
        crewCredit(81, 'Small Town Noir', 8, 1_000),
      ],
    );
    expect(titles(tiles)).toEqual([
      'Night Train',
      'Cold Harbour',
      'Small Town Noir',
      'Giant Thriller',
    ]);
  });

  it('without votes, the bigger part goes first, not the lower id', () => {
    const tiles = buildKnownFor(
      [],
      [credit(5, 'Short Part', 2, ['A']), credit(9, 'Long Part', 151, ['B'])],
    );
    expect(titles(tiles)).toEqual(['Long Part', 'Short Part']);
  });
});
