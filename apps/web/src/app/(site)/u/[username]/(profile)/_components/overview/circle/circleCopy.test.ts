import type { CirclePerson } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  levelLabel,
  personLabel,
  pickReason,
  seasonsAndEpisodes,
} from './circleCopy';

const person = (
  username: string,
  level: CirclePerson['level'],
): CirclePerson => ({ arc: 80, id: username, level, username });

describe('pickReason (V60 From your circle)', () => {
  it('a favourite of the closest match', () => {
    expect(
      pickReason({
        doorGenre: null,
        kind: 'favourite',
        people: [person('juno', 'super')],
      }),
    ).toBe('A favourite of your closest match.');
  });

  it('both closest matches finished it', () => {
    expect(
      pickReason({
        doorGenre: null,
        kind: 'finished',
        people: [person('juno', 'super'), person('margaux', 'very-high')],
      }),
    ).toBe('Both your closest matches finished it.');
  });

  it('a door line names the genre in lower case', () => {
    expect(
      pickReason({
        doorGenre: 'Anime',
        kind: 'favourite',
        people: [person('ivo', 'medium')],
      }),
    ).toBe('ivo’s door to anime.');
  });

  it('names the person when they are not a close match', () => {
    expect(
      pickReason({
        doorGenre: null,
        kind: 'favourite',
        people: [person('ivo', 'medium')],
      }),
    ).toBe('A favourite of ivo.');
    expect(
      pickReason({
        doorGenre: null,
        kind: 'finished',
        people: [person('ivo', 'low'), person('juno', 'super')],
      }),
    ).toBe('ivo and juno finished it.');
  });

  it('one person finishing, and no people at all', () => {
    expect(
      pickReason({
        doorGenre: null,
        kind: 'finished',
        people: [person('juno', 'very-high')],
      }),
    ).toBe('Your closest match finished it.');
    expect(pickReason({ doorGenre: null, kind: 'favourite', people: [] })).toBe(
      'A favourite in your circle.',
    );
  });
});

describe('labels', () => {
  it('names the six levels, and none under 5 shared shows', () => {
    expect(levelLabel('very-high')).toBe('Very high');
    expect(levelLabel('very-low')).toBe('Very low');
    expect(levelLabel(null)).toBeNull();
    expect(personLabel(person('juno', 'super'))).toBe('juno, Super match');
    expect(personLabel(person('wren', null))).toBe('wren');
  });

  it('seasons and episodes, with whatever is known', () => {
    expect(seasonsAndEpisodes(3, 26)).toBe('3 seasons, 26 episodes');
    expect(seasonsAndEpisodes(1, 8)).toBe('1 season, 8 episodes');
    expect(seasonsAndEpisodes(0, 0)).toBeNull();
  });
});
