import type { PersonShow, PersonShows } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { hasTvCredits } from './tvCredits';

const show = (id: number, name: string): PersonShow => ({
  characters: [],
  episodeCount: 0,
  id,
  isCast: false,
  isCrew: false,
  isGuest: false,
  isVoice: false,
  jobs: [],
  name,
  posterImage: '',
  role: '',
  slug: name.toLowerCase().replaceAll(' ', '-'),
});

const shows: PersonShows = {
  counts: {
    acting: 1,
    all: 1,
    behindTheCamera: 0,
    guest: 0,
    self: 0,
    upcoming: 0,
    voice: 0,
  },
  self: [],
  shows: [show(1, 'A Series')],
  upcoming: [],
};

describe('hasTvCredits (which TV sections the page lays out)', () => {
  it('is false for a person with no series at all (films only)', () => {
    expect(hasTvCredits(null)).toBe(false);
    expect(hasTvCredits({ ...shows, self: [], shows: [], upcoming: [] })).toBe(
      false,
    );
  });

  it('is true for any series, upcoming one or "as himself" credit', () => {
    expect(hasTvCredits(shows)).toBe(true);
    expect(
      hasTvCredits({
        ...shows,
        self: [show(9, 'Talk Show')],
        shows: [],
        upcoming: [],
      }),
    ).toBe(true);
  });

  it('keeps every section when the credits could not be read', () => {
    expect(hasTvCredits({ unavailable: true })).toBe(true);
  });
});
