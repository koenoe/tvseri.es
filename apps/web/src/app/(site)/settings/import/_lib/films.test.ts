import { describe, expect, it } from 'vitest';

import { NETFLIX_MAPPING } from './columns';
import { filmsLine, filmTitles } from './films';

describe('filmTitles', () => {
  it('names the first rows that have no episode part, once each', () => {
    const rows = [
      {
        Date: '11/6/26',
        Title: 'Taken: Natalee Holloway: I Knew He Would Kill Again',
      },
      { Date: '10/31/26', Title: 'Beat Luke Littler' },
      { Date: '10/30/26', Title: 'Beat Luke Littler' },
      { Date: '10/29/26', Title: 'Glass Onion' },
      { Date: '10/28/26', Title: 'Roma' },
    ];
    expect(filmTitles(rows, NETFLIX_MAPPING)).toEqual([
      'Beat Luke Littler',
      'Glass Onion',
    ]);
  });
});

describe('filmsLine', () => {
  it('names two and counts the rest', () => {
    expect(filmsLine(['Beat Luke Littler', 'Glass Onion'], 412)).toBe(
      'Beat Luke Littler, Glass Onion and 410 more',
    );
    expect(filmsLine(['Roma'], 1)).toBe('Roma');
    expect(filmsLine([], 3)).toBe('3 films and specials');
  });
});
