import { describe, expect, it } from 'vitest';

import { canonicalPath, toCanonicalId } from './canonical';
import personPath from './personPath';
import showPath from './showPath';

describe('toCanonicalId', () => {
  it('drops leading zeros and refuses anything but a positive id', () => {
    expect(toCanonicalId('017419')).toBe('17419');
    expect(toCanonicalId('0')).toBeNull();
    expect(toCanonicalId('abc')).toBeNull();
    expect(toCanonicalId('99999999999999999')).toBeNull();
  });

  it('takes up to MAX_TMDB_ID_DIGITS digits, as the long-id 404 rewrite does', () => {
    expect(toCanonicalId('99999999')).toBe('99999999');
    expect(toCanonicalId('00099999999')).toBe('99999999');
    expect(toCanonicalId('000123456789')).toBeNull();
    expect(toCanonicalId('123456789')).toBeNull();
  });
});

describe('canonicalPath', () => {
  const person = { id: 17419, slug: 'bryan-cranston' };

  it('is null for the canonical URL', () => {
    expect(
      canonicalPath(
        { id: '17419', slug: ['bryan-cranston'] },
        person,
        personPath,
      ),
    ).toBeNull();
  });

  it('fixes a missing, stale or deep slug and leading zeros', () => {
    const target = '/person/17419/bryan-cranston';
    expect(canonicalPath({ id: '17419' }, person, personPath)).toBe(target);
    expect(
      canonicalPath({ id: '17419', slug: ['old'] }, person, personPath),
    ).toBe(target);
    expect(
      canonicalPath(
        { id: '17419', slug: ['bryan-cranston', 'x'] },
        person,
        personPath,
      ),
    ).toBe(target);
    expect(
      canonicalPath(
        { id: '017419', slug: ['bryan-cranston'] },
        person,
        personPath,
      ),
    ).toBe(target);
  });

  it('builds a show URL the same way', () => {
    expect(
      canonicalPath(
        { id: '01396' },
        { id: 1396, slug: 'breaking-bad' },
        showPath,
      ),
    ).toBe('/1396/breaking-bad');
  });

  it('drops a slug when the person has none', () => {
    expect(
      canonicalPath({ id: '5', slug: ['x'] }, { id: 5, slug: '' }, personPath),
    ).toBe('/person/5');
  });
});
