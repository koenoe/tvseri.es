import { describe, expect, it } from 'vitest';

import {
  faceLabel,
  peopleCount,
  stackLine,
  toCastAndCrew,
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
  it('lists the creators first, then the cast with their characters', () => {
    expect(toCastAndCrew([STORER], [WHITE, EDEBIRI])).toEqual([
      {
        id: 1,
        image: '1.jpg',
        name: 'Christopher Storer',
        role: 'Creator',
        slug: 'christopher-storer',
      },
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
    ]);
  });

  it('lists a creator who also acts once, as the creator', () => {
    const acting = credit(1, 'Christopher Storer', 'Himself');
    const people = toCastAndCrew([STORER], [acting, WHITE]);

    expect(people.map((person) => [person.id, person.role])).toEqual([
      [1, 'Creator'],
      [2, 'Carmy Berzatto'],
    ]);
  });

  it('is the cast alone without creators, and the creators alone without a cast', () => {
    expect(toCastAndCrew([], [WHITE]).map((person) => person.id)).toEqual([2]);
    expect(toCastAndCrew([STORER], []).map((person) => person.id)).toEqual([1]);
  });
});

describe('stackLine', () => {
  const people = toCastAndCrew([STORER], [WHITE, EDEBIRI]);

  it('names two and counts the rest', () => {
    expect(stackLine(people, 21)).toEqual({
      first: 'Christopher Storer',
      rest: ', Jeremy Allen White and 19 more',
    });
  });

  it('joins exactly two with "and", never "and 0 more"', () => {
    expect(stackLine(people.slice(0, 2), 2)).toEqual({
      first: 'Christopher Storer',
      rest: ' and Jeremy Allen White',
    });
  });

  it('names the first of the cast after the first creator, never a second creator', () => {
    const two = toCastAndCrew([STORER, credit(9, 'Joanna Calo')], [WHITE]);

    expect(stackLine(two, 3)).toEqual({
      first: 'Christopher Storer',
      rest: ', Jeremy Allen White and 1 more',
    });
  });

  it('names one alone', () => {
    expect(stackLine(people.slice(0, 1), 1)).toEqual({
      first: 'Christopher Storer',
      rest: '',
    });
  });
});

describe('faceLabel', () => {
  it('names the role, the creator, or the person alone', () => {
    const [storer, white] = toCastAndCrew([STORER], [WHITE]);
    const nameless = toCastAndCrew([], [credit(4, 'Extra')])[0];

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
