import { describe, expect, it } from 'vitest';

import { genreRows, PHONE_ROWS } from './model';

const items = [
  { count: 48, genre: 'Drama' },
  { count: 25, genre: 'Crime' },
  { count: 20, genre: 'Documentary' },
  { count: 1, genre: 'Sci-Fi & Fantasy' },
];

describe('genreRows', () => {
  it('measures each bar against the top genre, to one decimal', () => {
    const rows = genreRows(items);
    expect(rows.map((row) => row.width)).toEqual([
      '100.0%',
      '52.1%',
      '41.7%',
      '2.1%',
    ]);
    expect(rows.map((row) => row.value)).toEqual([
      '48 series',
      '25 series',
      '20 series',
      '1 series',
    ]);
  });

  it('marks only the top genre', () => {
    expect(genreRows(items).map((row) => row.top)).toEqual([
      true,
      false,
      false,
      false,
    ]);
  });

  it('is empty without genres', () => {
    expect(genreRows([])).toEqual([]);
    expect(genreRows([{ count: 0, genre: 'Drama' }])).toEqual([]);
  });

  it('keeps six rows for the phone', () => {
    expect(PHONE_ROWS).toBe(6);
  });
});
