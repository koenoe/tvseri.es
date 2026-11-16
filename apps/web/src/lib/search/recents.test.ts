import { describe, expect, it } from 'vitest';

import { MAX_RECENTS, readRecents, withRecent } from './recents';
import type { SearchCell } from './sections';

const cell = (kind: 'person' | 'show', id: number): SearchCell => ({
  href: kind === 'show' ? `/${id}` : `/person/${id}`,
  id,
  image: '',
  key: `${kind}-${id}`,
  kind,
  name: `${kind} ${id}`,
});

describe('withRecent', () => {
  it('puts what was opened first', () => {
    expect(
      withRecent([cell('show', 1)], cell('person', 2)).map((c) => c.key),
    ).toEqual(['person-2', 'show-1']);
  });

  it('keeps one entry per show or person', () => {
    const list = [cell('show', 1), cell('person', 2), cell('show', 3)];

    expect(withRecent(list, cell('show', 3)).map((c) => c.key)).toEqual([
      'show-3',
      'show-1',
      'person-2',
    ]);
  });

  it('a show and a person with the same id are different', () => {
    expect(withRecent([cell('show', 1)], cell('person', 1))).toHaveLength(2);
  });

  it(`keeps the last ${MAX_RECENTS}`, () => {
    let list: ReadonlyArray<SearchCell> = [];
    for (let id = 1; id <= 6; id += 1) {
      list = withRecent(list, cell('show', id));
    }

    expect(MAX_RECENTS).toBe(4);
    expect(list.map((c) => c.id)).toEqual([6, 5, 4, 3]);
  });

  it('stores only what a chip draws', () => {
    const full = { ...cell('show', 1), knownFor: 'x', role: 'y', year: '2008' };

    expect(Object.keys(withRecent([], full)[0] ?? {}).sort()).toEqual([
      'href',
      'id',
      'image',
      'key',
      'kind',
      'name',
    ]);
  });
});

describe('withRecent: a member', () => {
  it('keeps a member opened from search as a chip, without an id', () => {
    const member: SearchCell = {
      href: '/u/juno-tv',
      image: '',
      key: 'member-juno-tv',
      kind: 'member',
      name: '@juno-tv',
    };
    expect(withRecent([cell('show', 1)], member)).toEqual([
      member,
      cell('show', 1),
    ]);
  });
});

describe('readRecents: what localStorage held', () => {
  const member: SearchCell = {
    href: '/u/juno-tv',
    image: '',
    key: 'member-juno-tv',
    kind: 'member',
    name: '@juno-tv',
  };

  it('keeps well-formed shows, people and members', () => {
    const recents = [cell('show', 1), cell('person', 2), member];
    expect(readRecents({ recents })).toEqual(recents);
  });

  it('is empty for anything that is not a stored list', () => {
    expect(readRecents(undefined)).toEqual([]);
    expect(readRecents(null)).toEqual([]);
    expect(readRecents('[]')).toEqual([]);
    expect(readRecents({ recents: 'x' })).toEqual([]);
  });

  it('drops entries a chip cannot draw', () => {
    const recents = [
      cell('show', 1),
      null,
      { ...cell('show', 2), name: 3 },
      { ...cell('show', 3), id: '3' },
      { ...cell('show', 4), kind: 'film' },
      { href: '/u/x', key: 'member-x', kind: 'member', name: '@x' },
    ];
    expect(readRecents({ recents })).toEqual([cell('show', 1)]);
  });

  it('drops links that leave the site', () => {
    const recents = [
      { ...cell('show', 1), href: 'javascript:alert(1)' },
      { ...cell('show', 2), href: '//evil.example/2' },
      { ...cell('show', 3), href: '/\\evil.example/3' },
      { ...cell('show', 4), href: 'https://evil.example/4' },
      cell('show', 5),
    ];
    expect(readRecents({ recents })).toEqual([cell('show', 5)]);
  });

  it(`keeps at most ${MAX_RECENTS}`, () => {
    const recents = [1, 2, 3, 4, 5, 6].map((id) => cell('show', id));
    expect(readRecents({ recents })).toHaveLength(MAX_RECENTS);
  });
});
