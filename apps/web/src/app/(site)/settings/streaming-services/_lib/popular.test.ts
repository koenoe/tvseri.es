import type { WatchProvider } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { popularLabel, restOf } from './popular';

const provider = (id: number, name: string): WatchProvider => ({
  id,
  logo: `https://image.tmdb.org/t/p/w92/${id}.jpg`,
  logoPath: `/${id}.jpg`,
  name,
});

const all = Array.from({ length: 13 }, (_, i) =>
  provider(i + 1, `Service ${i + 1}`),
);
const mine = all.slice(0, 2);

describe('restOf', () => {
  it('follows the app’s fold rule: three more fold on a phone only', () => {
    const rest = restOf({
      providers: all.slice(0, 12),
      query: '',
      selected: mine,
      showAll: false,
    });
    // 10 unselected, 3 past the 7: all render, the phone hides them (CSS)
    expect(rest.fold).toBe('phone');
    expect(rest.tiles).toHaveLength(10);
    expect(rest.phoneFolded).toBe(true);
  });

  it('shows two more whole, with no Show all', () => {
    const rest = restOf({
      providers: all.slice(0, 11),
      query: '',
      selected: mine,
      showAll: false,
    });
    expect(rest.fold).toBe('none');
    expect(rest.tiles).toHaveLength(9);
    expect(rest.phoneFolded).toBe(false);
  });

  it('leaves out what is selected, in TMDB order, and caps at 7', () => {
    const rest = restOf({
      providers: all,
      query: '',
      selected: mine,
      showAll: false,
    });
    expect(rest.tiles.map((p) => p.id)).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect(rest.total).toBe(11);
    expect(rest.fold).toBe('all');
  });

  it('shows all of them on request', () => {
    const rest = restOf({
      providers: all,
      query: '',
      selected: mine,
      showAll: true,
    });
    expect(rest.tiles).toHaveLength(11);
    expect(rest.fold).toBe('all');
  });

  it('has no Show all when everything already fits', () => {
    const rest = restOf({
      providers: all.slice(0, 8),
      query: '',
      selected: mine,
      showAll: false,
    });
    expect(rest.tiles).toHaveLength(6);
    expect(rest.fold).toBe('none');
  });

  it('filters by name, ignores case and shows every match', () => {
    const rest = restOf({
      providers: all,
      query: ' SERVICE 1',
      selected: mine,
      showAll: false,
    });
    expect(rest.tiles.map((p) => p.name)).toEqual([
      'Service 10',
      'Service 11',
      'Service 12',
      'Service 13',
    ]);
    expect(rest.fold).toBe('none');
    expect(rest.filtering).toBe(true);
  });

  it('is empty for a query nothing matches', () => {
    const rest = restOf({
      providers: all,
      query: 'zzz',
      selected: mine,
      showAll: false,
    });
    expect(rest.tiles).toEqual([]);
  });
});

describe('popularLabel', () => {
  it('names the region, with "the" where English wants it', () => {
    expect(popularLabel('United Kingdom', 'GB', '')).toBe(
      'Popular in the United Kingdom',
    );
    expect(popularLabel('Netherlands', 'NL', '')).toBe(
      'Popular in the Netherlands',
    );
    expect(popularLabel('Germany', 'DE', '')).toBe('Popular in Germany');
  });

  it('names the filter while one is typed', () => {
    expect(popularLabel('Germany', 'DE', ' sky ')).toBe('Matching “sky”');
  });
});
