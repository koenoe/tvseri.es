import { describe, expect, it } from 'vitest';

import {
  compareTitles,
  foldTitle,
  initialOf,
  matchesFind,
  sortTitle,
} from './title';

describe('sortTitle', () => {
  it.each([
    ['The Bear', 'bear'],
    ['A Very English Scandal', 'very english scandal'],
    ['An Idiot Abroad', 'idiot abroad'],
    ['The', 'the'],
    ['Theodosia', 'theodosia'],
    ['Andor', 'andor'],
    ['  the   White Lotus ', 'white lotus'],
    ['Señor Café', 'senor cafe'],
    ['Élite', 'elite'],
    ["'Allo 'Allo!", "allo 'allo!"],
    ['(500) Episodes', '500) episodes'],
  ])('%s → %s', (title, expected) => {
    expect(sortTitle(title)).toBe(expected);
  });
});

describe('initialOf', () => {
  it.each([
    ['The Bear', 'b'],
    ['A Man on the Inside', 'm'],
    ['Élite', 'e'],
    ['11.22.63', '#'],
    ['12 Monkeys', '#'],
    ['進撃の巨人', '#'],
    ['오징어 게임', '#'],
    ['المنصة', '#'],
    ['Ζ', '#'],
  ])('%s → %s', (title, expected) => {
    expect(initialOf(title)).toBe(expected);
  });
});

describe('compareTitles', () => {
  it('orders numbers naturally and ignores case and accents', () => {
    const titles = ['12 monkeys', '11.22.63', '2 broke girls', 'b', 'A'];
    expect([...titles].sort(compareTitles)).toEqual([
      '2 broke girls',
      '11.22.63',
      '12 monkeys',
      'A',
      'b',
    ]);
    expect(compareTitles('élite', 'Elite')).toBe(0);
  });
});

describe('matchesFind', () => {
  it('matches a prefix with or without the article, folded', () => {
    expect(matchesFind('The White Lotus', 'white')).toBe(true);
    expect(matchesFind('The White Lotus', 'The Wh')).toBe(true);
    expect(matchesFind('The White Lotus', 'lotus')).toBe(false);
    expect(matchesFind('Señor Café', 'senor')).toBe(true);
    expect(matchesFind('Élite', 'ELI')).toBe(true);
    expect(matchesFind('Anything', '   ')).toBe(true);
  });

  it('folds like sortTitle', () => {
    expect(foldTitle('  Ça   Va ')).toBe('ca va');
  });
});
