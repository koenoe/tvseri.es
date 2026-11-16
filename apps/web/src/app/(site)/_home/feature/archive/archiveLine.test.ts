import type { Feature, TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { archiveLine, archiveWhy } from './archiveLine';

type Archive = Extract<Feature, Readonly<{ kind: 'archive' }>>;

const archive = (extra: Partial<Archive> = {}, tagline = ''): Archive => ({
  allTime: { oldest: true, rank: 4, top: 5 },
  kind: 'archive',
  rank: 1,
  series: { tagline, title: 'The Wire' } as TvSeries,
  yearsOld: 24,
  ...extra,
});

describe('archiveWhy', () => {
  it('draws the board line: the age, not the rank the sentence already says', () => {
    expect(archiveWhy(archive())).toBe('24 years old, not trending this week');
    expect(archiveLine(archive())).toContain('all-time top 5');
  });

  it('is the same line outside the all-time top 20', () => {
    expect(archiveWhy(archive({ allTime: null }))).toBe(
      '24 years old, not trending this week',
    );
  });
});

describe('archiveLine', () => {
  it('draws the board copy from the tagline and the standing', () => {
    expect(
      archiveLine(
        archive({}, 'Five seasons, one city, every institution in it.'),
      ),
    ).toBe(
      'Five seasons, one city, every institution in it. The oldest series in the all-time top 5, and the one nobody is talking about this week.',
    );
  });

  it('closes a tagline without a full stop', () => {
    expect(archiveLine(archive({}, 'Listen carefully'))).toMatch(
      /^Listen carefully\. The oldest/,
    );
  });

  it('says "one of" when an older show shares the bucket', () => {
    expect(
      archiveLine(archive({ allTime: { oldest: false, rank: 8, top: 10 } })),
    ).toBe(
      'One of the all-time top 10, and nobody is talking about it this week.',
    );
  });

  it('falls back to its age outside the top 20', () => {
    expect(archiveLine(archive({ allTime: null }))).toBe(
      '24 years on, and nobody is talking about it this week.',
    );
  });
});
