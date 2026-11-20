import { describe, expect, it } from 'vitest';

import { showIdOf } from './showPath';

describe('showIdOf', () => {
  it.each([
    ['/136315/the-bear', 136315],
    ['/136315', 136315],
    ['/136315/the-bear?season=1&episode=2', 136315],
    ['/136315?season=1', 136315],
  ])('reads the show of %s', (href, id) => {
    expect(showIdOf(href)).toBe(id);
  });

  it.each([
    '/person/17419/bryan-cranston',
    '/discover',
    '/u/nina',
    '/',
    '/136315abc',
  ])('is null for %s', (href) => {
    expect(showIdOf(href)).toBeNull();
  });
});
