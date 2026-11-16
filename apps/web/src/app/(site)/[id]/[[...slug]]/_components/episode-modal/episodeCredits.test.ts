import type { EpisodePerson, Person } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  guestFaces,
  starringFaces,
  toEpisodeModalCredits,
  toRollBlocks,
} from './episodeCredits';

const crew = (id: number, name: string, job: string): EpisodePerson => ({
  character: '',
  id,
  image: '',
  job,
  name,
});

const guest = (id: number, name: string, image = ''): EpisodePerson => ({
  character: `Role ${id}`,
  id,
  image,
  job: '',
  name,
});

const castMember = (id: number, image = 'face.jpg'): Person => ({
  character: `Regular ${id}`,
  id,
  image,
  job: '',
  name: `Actor ${id}`,
  numberOfEpisodes: 10,
  slug: `actor-${id}`,
});

const EPISODE = {
  credits: {
    crew: [
      crew(2, 'Ada Writer', 'Writer'),
      crew(1, 'Dee Director', 'Director'),
      crew(3, 'Tess Teleplay', 'Teleplay'),
      crew(2, 'Ada Writer', 'Story'),
      crew(4, 'Phil Camera', 'Director of Photography'),
      crew(5, 'Eve Editor', 'Editor'),
      crew(6, 'Cat Caterer', 'Craft Service'),
    ],
    guestStars: [guest(10, 'Gina Guest', 'g.jpg'), guest(11, 'Nell NoPhoto')],
  },
};

describe('toEpisodeModalCredits', () => {
  it('groups the board’s crew jobs, in its order, without duplicates', () => {
    expect(toEpisodeModalCredits(EPISODE, []).crew).toEqual([
      { people: [{ id: 1, name: 'Dee Director' }], role: 'Directed by' },
      {
        people: [
          { id: 2, name: 'Ada Writer' },
          { id: 3, name: 'Tess Teleplay' },
        ],
        role: 'Written by',
      },
      {
        people: [{ id: 4, name: 'Phil Camera' }],
        role: 'Director of photography',
      },
      { people: [{ id: 5, name: 'Eve Editor' }], role: 'Edited by' },
    ]);
  });

  it('trims guests and keeps the first eight regulars', () => {
    const cast = Array.from({ length: 12 }, (_, i) => castMember(100 + i));
    const credits = toEpisodeModalCredits(EPISODE, cast);
    expect(credits.guestStars[0]).toEqual({
      character: 'Role 10',
      id: 10,
      image: 'g.jpg',
      name: 'Gina Guest',
    });
    expect(credits.starring).toHaveLength(8);
    expect(credits.starring[0]).toEqual({
      character: 'Regular 100',
      id: 100,
      image: 'face.jpg',
      name: 'Actor 100',
    });
  });
});

describe('toRollBlocks', () => {
  it('rolls Directed, Written, Guest starring, Starring, then the crew', () => {
    const credits = toEpisodeModalCredits(EPISODE, [castMember(100)]);
    expect(toRollBlocks(credits).map((block) => block.role)).toEqual([
      'Directed by',
      'Written by',
      'Guest starring',
      'Starring',
      'Director of photography',
      'Edited by',
    ]);
  });

  it('leaves out empty groups', () => {
    const credits = toEpisodeModalCredits(
      { credits: { crew: [], guestStars: [] } },
      [],
    );
    expect(toRollBlocks(credits)).toEqual([]);
  });
});

describe('faces', () => {
  it('shows only people with a photo, ten guests at most', () => {
    const many = {
      credits: {
        crew: [],
        guestStars: Array.from({ length: 14 }, (_, i) =>
          guest(i, `G${i}`, i === 3 ? '' : 'p.jpg'),
        ),
      },
    };
    const credits = toEpisodeModalCredits(many, [
      castMember(1),
      castMember(2, ''),
    ]);
    const faces = guestFaces(credits);
    expect(faces).toHaveLength(10);
    expect(faces.some((person) => person.id === 3)).toBe(false);
    expect(starringFaces(credits).map((person) => person.id)).toEqual([1]);
  });
});
