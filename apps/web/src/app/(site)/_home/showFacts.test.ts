import { describe, expect, it } from 'vitest';

import { showSeasons, showYears } from './showFacts';

describe('showSeasons', () => {
  it('is the season count', () => {
    expect(showSeasons({ numberOfSeasons: 3 })).toBe('3 seasons');
  });

  it('is empty for a show without seasons', () => {
    expect(showSeasons({ numberOfSeasons: 0 })).toBe('');
  });
});

describe('showYears', () => {
  it('is the run of an ended show', () => {
    expect(
      showYears({
        firstAirDate: '2002-06-02',
        lastAirDate: '2008-03-09',
        releaseYear: '2002',
        status: 'Ended',
      }),
    ).toBe('2002–2008');
  });

  it('falls back to the release year without air dates', () => {
    expect(
      showYears({
        firstAirDate: '',
        lastAirDate: '',
        releaseYear: '2019',
        status: 'Ended',
      }),
    ).toBe('2019');
  });
});
