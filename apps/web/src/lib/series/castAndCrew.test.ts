import { describe, expect, it } from 'vitest';

import {
  countPeople,
  faceLabel,
  peopleCount,
  stackLine,
  toCastAndCrew,
  toCastStack,
} from './castAndCrew';

const credit = (id: number, name: string, character = '') => ({
  character,
  id,
  image: `${id}.jpg`,
  name,
  slug: name.toLowerCase().replace(/ /g, '-'),
});

const STORER = credit(1, 'Christopher Storer');
const WHITE = credit(2, 'Jeremy Allen White', 'Carmy Berzatto');
const EDEBIRI = credit(3, 'Ayo Edebiri', 'Sydney Adamu');

describe('toCastAndCrew', () => {
  it('splits the cast, with their characters, from the creators', () => {
    expect(toCastAndCrew([STORER], [WHITE, EDEBIRI])).toEqual({
      cast: [
        {
          id: 2,
          image: '2.jpg',
          name: 'Jeremy Allen White',
          role: 'Carmy Berzatto',
          slug: 'jeremy-allen-white',
        },
        {
          id: 3,
          image: '3.jpg',
          name: 'Ayo Edebiri',
          role: 'Sydney Adamu',
          slug: 'ayo-edebiri',
        },
      ],
      crew: [
        {
          id: 1,
          image: '1.jpg',
          name: 'Christopher Storer',
          role: 'Creator',
          slug: 'christopher-storer',
        },
      ],
    });
  });

  it('lists a creator who also acts in both sections', () => {
    const acting = credit(1, 'Christopher Storer', 'Himself');
    const { cast, crew } = toCastAndCrew([STORER], [acting, WHITE]);

    expect(cast.map((person) => [person.id, person.role])).toEqual([
      [1, 'Himself'],
      [2, 'Carmy Berzatto'],
    ]);
    expect(crew.map((person) => [person.id, person.role])).toEqual([
      [1, 'Creator'],
    ]);
  });

  it('has an empty crew without creators, and an empty cast without a cast', () => {
    expect(toCastAndCrew([], [WHITE]).crew).toEqual([]);
    expect(toCastAndCrew([STORER], []).cast).toEqual([]);
  });
});

describe('countPeople', () => {
  it('counts a creator who also acts once', () => {
    const acting = credit(1, 'Christopher Storer', 'Himself');

    expect(countPeople([STORER], [acting, WHITE, EDEBIRI])).toBe(3);
    expect(countPeople([STORER], [WHITE, EDEBIRI])).toBe(3);
    expect(countPeople([], [])).toBe(0);
  });
});

describe('toCastStack', () => {
  it('takes the first five of the cast with a photo, never a blank face', () => {
    const cast = Array.from({ length: 8 }, (_, index) =>
      credit(index + 10, `Actor ${index}`, `Role ${index}`),
    );
    const blank = { ...credit(5, 'No Photo', 'Extra'), image: '' };

    const withBlank = [...cast.slice(0, 1), blank, ...cast.slice(1)];

    expect(toCastStack(withBlank).map((person) => person.id)).toEqual([
      10, 11, 12, 13, 14,
    ]);
  });
});

describe('stackLine', () => {
  it('names the first two of the cast and counts the rest of the cast', () => {
    expect(stackLine([WHITE, EDEBIRI], 21)).toEqual({
      first: 'Jeremy Allen White',
      rest: ', Ayo Edebiri and 19 more',
    });
  });

  it('joins exactly two with "and", never "and 0 more"', () => {
    expect(stackLine([WHITE, EDEBIRI], 2)).toEqual({
      first: 'Jeremy Allen White',
      rest: ' and Ayo Edebiri',
    });
  });

  it('names one alone', () => {
    expect(stackLine([WHITE], 1)).toEqual({
      first: 'Jeremy Allen White',
      rest: '',
    });
  });
});

describe('faceLabel', () => {
  it('names the role, the creator, or the person alone', () => {
    const {
      cast: [white],
      crew: [storer],
    } = toCastAndCrew([STORER], [WHITE]);
    const nameless = toCastAndCrew([], [credit(4, 'Extra')]).cast[0];

    expect(storer && faceLabel(storer)).toBe('Christopher Storer, creator');
    expect(white && faceLabel(white)).toBe(
      'Jeremy Allen White as Carmy Berzatto',
    );
    expect(nameless && faceLabel(nameless)).toBe('Extra');
  });
});

describe('peopleCount', () => {
  it('counts one person, and groups thousands', () => {
    expect(peopleCount(1)).toBe('1 person');
    expect(peopleCount(21)).toBe('21 people');
    expect(peopleCount(1204)).toBe('1,204 people');
  });
});
