import { describe, expect, it } from 'vitest';

import { buildSections, gridOf, personRole } from './sections';
import { BRE, BRYAN, NOTHING } from './testData';

const names = (sections: ReturnType<typeof buildSections>) =>
  sections.map((section) => [
    section.kind,
    section.cells.map((cell) => cell.name),
  ]);

describe('buildSections: what Enter opens', () => {
  it('puts the shows first when the best match is a show; its first poster is the Enter target', () => {
    const sections = buildSections(BRE, 'desktop');

    expect(sections.map((section) => section.kind)).toEqual(['shows']);
    expect(sections[0]?.cells[0]).toMatchObject({
      href: '/1396/breaking-bad',
      kind: 'show',
      name: 'Breaking Bad',
      year: '2008',
    });
  });

  it('puts the people first when the best match is a person', () => {
    const sections = buildSections(BRYAN, 'desktop');

    expect(sections.map((section) => section.kind)).toEqual([
      'people',
      'shows',
    ]);
    expect(sections[0]?.cells[0]).toMatchObject({
      href: '/person/17419/bryan-cranston',
      knownFor: 'Breaking Bad, Isle of Dogs',
      name: 'Bryan Cranston',
      role: 'Actor',
    });
  });

  it('ties and unknowns go to the shows', () => {
    const sections = buildSections({ ...BRYAN, best: null }, 'desktop');

    expect(sections[0]?.kind).toBe('shows');
  });

  it('shows up to 8 posters on desktop, 6 on a phone', () => {
    expect(buildSections(BRE, 'desktop')[0]?.cells).toHaveLength(8);
    expect(buildSections(BRE, 'phone')[0]?.cells).toHaveLength(6);
  });

  it('leaves out an empty block and has nothing for nothing', () => {
    expect(names(buildSections(NOTHING, 'desktop'))).toEqual([]);
    expect(buildSections({ ...BRYAN, series: [] }, 'desktop')).toHaveLength(1);
  });

  it('gives every cell a unique key across blocks', () => {
    const keys = buildSections(BRYAN, 'desktop').flatMap((section) =>
      section.cells.map((cell) => cell.key),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('personRole', () => {
  it.each([
    ['Acting', 'Actor'],
    ['Visual Effects', 'Visual effects'],
    [undefined, ''],
  ])('%s → %s', (department, role) => {
    expect(personRole(department)).toBe(role);
  });
});

describe('gridOf', () => {
  it('desktop blocks are four across', () => {
    expect(gridOf(buildSections(BRE, 'desktop'), 'desktop')).toEqual([
      { columns: 4, size: 8 },
    ]);
  });

  it('on a phone the people are one sideways strip and the posters go three across', () => {
    expect(gridOf(buildSections(BRYAN, 'phone'), 'phone')).toEqual([
      { columns: Number.POSITIVE_INFINITY, size: 3 },
      { columns: 3, size: 5 },
    ]);
  });
});

describe('buildSections: a member found by their handle', () => {
  const JUNO = { id: '01JUNO', username: 'juno-tv' };

  it('is first, and what Enter opens, linking to their profile', () => {
    const sections = buildSections(
      { best: 'members', members: [JUNO], people: [], series: [] },
      'desktop',
    );
    expect(sections[0]?.cells).toEqual([
      {
        href: '/u/juno-tv',
        image: '',
        key: 'member-juno-tv',
        kind: 'member',
        name: '@juno-tv',
      },
    ]);
  });

  it('is one row of chips on desktop and phone', () => {
    const sections = buildSections(
      { best: 'members', members: [JUNO], people: [], series: [] },
      'phone',
    );
    expect(gridOf(sections, 'phone').at(-1)).toEqual({
      columns: Number.POSITIVE_INFINITY,
      size: 1,
    });
    expect(gridOf(sections, 'desktop').at(-1)).toEqual({
      columns: Number.POSITIVE_INFINITY,
      size: 1,
    });
  });
});
