import { NETWORKS } from '@tvseri.es/constants';
import { describe, expect, it } from 'vitest';

import { chipsWithShows, landingSlugs, networkChips } from './indexChips';

const entry = (code: string, englishName: string, name = englishName) => ({
  code,
  englishName,
  name,
});

describe('chipsWithShows', () => {
  it('keeps countries with a landing and shows, A to Z, linked by lower-case code', () => {
    expect(
      chipsWithShows(
        'country',
        [
          entry('GB', 'United Kingdom'),
          entry('DK', 'Denmark', 'Danmark'),
          entry('AQ', 'Antarctica'),
          entry('XX', 'Nowhere'),
        ],
        { aq: 0, dk: 1120, gb: 7240, xx: 4 },
      ),
    ).toEqual([
      { href: '/country/dk', label: 'Denmark' },
      { href: '/country/gb', label: 'United Kingdom' },
    ]);
  });

  it('does the same for languages, falling back to the own name', () => {
    expect(
      chipsWithShows(
        'language',
        [
          entry('ja', 'Japanese', '日本語'),
          entry('ko', '', '한국어'),
          entry('xx', 'No'),
        ],
        { ja: 16_900, ko: 4000 },
      ),
    ).toEqual([
      { href: '/language/ja', label: 'Japanese' },
      { href: '/language/ko', label: '한국어' },
    ]);
  });
});

describe('landingSlugs', () => {
  it('lists the codes that have a landing', () => {
    expect(
      landingSlugs('country', [
        entry('GB', 'United Kingdom'),
        entry('XX', 'No'),
      ]),
    ).toEqual(['gb']);
  });
});

describe('networkChips', () => {
  it('links every network with a landing, A to Z', () => {
    const chips = networkChips();
    expect(chips).toHaveLength(NETWORKS.length);
    expect(chips).toContainEqual({ href: '/network/hbo', label: 'HBO' });
    const labels = chips.map((chip) => chip.label);
    expect(labels).toEqual(
      [...labels].sort((a, b) => a.localeCompare(b, 'en')),
    );
  });
});
