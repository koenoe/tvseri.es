import type { GenreLandingFacts } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { genreFacts, oftenWith } from './genreHero';

const crime: GenreLandingFacts = {
  alsoWith: [
    { count: 7758, id: 18, name: 'Drama', percent: 71, slug: 'drama' },
    { count: 2400, id: 9648, name: 'Mystery', percent: 22, slug: 'mystery' },
  ],
  byKind: [],
  count: 10_927,
  newLastYear: 1040,
  peakDecade: { count: 3180, slug: '2010s' },
  slug: 'crime',
  subGenres: [],
  type: 'genre',
};

describe('genre hero', () => {
  it('writes the four facts', () => {
    expect(genreFacts(crime)).toEqual([
      { caption: 'series on TMDB', value: '10,927' },
      { caption: 'are also Drama', value: '71%' },
      { caption: 'started in the 2010s', value: '3,180' },
      { caption: 'new in the last year', value: '1,040' },
    ]);
  });

  it("writes TMDB's cap as 20,000+ and leaves out the share of it", () => {
    const capped = genreFacts({
      ...crime,
      count: 20_001,
      peakDecade: { count: 20_001, slug: '2020s' },
    });
    expect(capped).toEqual([
      { caption: 'series on TMDB', value: '20,000+' },
      { caption: 'started in the 2020s', value: '20,000+' },
      { caption: 'new in the last year', value: '1,040' },
    ]);
  });

  it('leaves out a fact the API could not work out', () => {
    const facts = genreFacts({ ...crime, alsoWith: [], peakDecade: null });
    expect(facts.map((fact) => fact.caption)).toEqual([
      'series on TMDB',
      'new in the last year',
    ]);
  });

  it('names the closest genres for desktop and phone', () => {
    expect(oftenWith(crime)).toEqual({
      desktop: 'Often with Drama and Mystery',
      phone: 'With Drama, Mystery',
    });
    expect(oftenWith({ ...crime, alsoWith: [] })).toBeNull();
  });
});
