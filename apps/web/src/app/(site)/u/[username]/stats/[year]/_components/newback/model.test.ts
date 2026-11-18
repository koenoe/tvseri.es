import { describe, expect, it } from 'vitest';

import { newBackSummary, splitLabel } from './model';

const shows = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    posterImage: `${prefix}${index}.jpg`,
    slug: `${prefix}-${index}`,
    title: `${prefix} ${index}`,
  }));

describe('newBackSummary', () => {
  it('counts both lists and takes five posters and three titles of each', () => {
    const summary = newBackSummary({
      back: shows(27, 'b'),
      new: shows(44, 'n'),
    });
    expect(summary.newCount).toBe(44);
    expect(summary.backCount).toBe(27);
    expect(summary.new.stack).toHaveLength(5);
    expect(summary.new.caption).toBe('n 0, n 1, n 2');
    expect(summary.back.caption).toBe('b 0, b 1, b 2');
  });

  it('copes with short and empty lists', () => {
    const summary = newBackSummary({ back: [], new: shows(2, 'n') });
    expect(summary.back.stack).toEqual([]);
    expect(summary.back.caption).toBe('');
    expect(summary.new.caption).toBe('n 0, n 1');
  });
});

describe('the caption never ends mid-phrase', () => {
  const named = (...titles: string[]) =>
    titles.map((title, index) => ({
      id: index + 1,
      posterImage: '',
      slug: `s-${index}`,
      title,
    }));

  it('keeps the three titles when they fit', () => {
    const summary = newBackSummary({
      back: [],
      new: named('The Pitt', 'Adolescence', 'Billions'),
    });
    expect(summary.new.caption).toBe('The Pitt, Adolescence, Billions');
  });

  it('fits fewer long titles and counts the rest from what it shows', () => {
    const summary = newBackSummary({
      back: [],
      new: named(
        'The Marvelous Mrs. Maisel: The Extended Years',
        'Gangs of London',
        'The Ballad of the Seven Rivers',
        'A Fourth Show',
        'A Fifth Show',
      ),
    });
    expect(summary.new.caption).toMatch(/ and \d+ more$/);
    expect(summary.new.caption).toBe(
      'The Marvelous Mrs. Maisel: The Extended Years, Gangs of London and 3 more',
    );
  });
});

describe('splitLabel', () => {
  it('says what the bar shows', () => {
    expect(splitLabel(44, 27)).toBe('44 new series, 27 returning');
    expect(splitLabel(1, 0)).toBe('1 new series, 0 returning');
  });
});
