import { describe, expect, it } from 'vitest';

import showPath from './showPath';

describe('showPath', () => {
  it('links to the show with its slug', () => {
    expect(showPath(1396, 'breaking-bad')).toBe('/1396/breaking-bad');
  });

  it('links to the bare id when there is no slug', () => {
    expect(showPath(1396)).toBe('/1396');
    expect(showPath(1396, '')).toBe('/1396');
    expect(showPath(1396, null)).toBe('/1396');
  });

  it('takes the id as a numeric string too', () => {
    expect(showPath('1396', 'breaking-bad')).toBe('/1396/breaking-bad');
    expect(showPath('1396')).toBe('/1396');
  });
});
