import type { ThemeLandingFacts } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  bestTitle,
  mostlyLine,
  pickSpotlight,
  spotlightReason,
  themeLower,
  themeSeries,
} from './themeCopy';

const show = (id: number, voteAverage: number) => ({ id, voteAverage });

describe('theme copy', () => {
  it('writes a name inside a sentence, keeping capitals that mean something', () => {
    expect(themeLower('Time travel')).toBe('time travel');
    expect(themeLower('Robots and AI')).toBe('robots and AI');
    expect(themeLower('LGBTQ+')).toBe('LGBTQ+');
    expect(themeLower('Set in the 1980s')).toBe('set in the 1980s');
  });

  it('names a theme’s shows: "{theme} series", or the kind of show itself', () => {
    expect(themeSeries('time-travel', 'Time travel')).toBe(
      'time travel series',
    );
    expect(themeSeries('dystopia', 'Dystopia')).toBe('dystopia series');
    expect(themeSeries('lgbtq', 'LGBTQ+')).toBe('LGBTQ+ series');
    // people and creatures are plural names: the series take the singular
    expect(themeSeries('detectives', 'Detectives')).toBe('detective series');
    expect(themeSeries('zombies', 'Zombies')).toBe('zombie series');
    expect(themeSeries('robots-and-ai', 'Robots and AI')).toBe(
      'robot and AI series',
    );
    // a subgenre names a kind of show already
    expect(themeSeries('dark-comedies', 'Dark comedies')).toBe('dark comedies');
    expect(themeSeries('legal-dramas', 'Legal dramas')).toBe('legal dramas');
    expect(themeSeries('set-in-the-1980s', 'Set in the 1980s')).toBe(
      'series set in the 1980s',
    );
  });

  it('names the best row', () => {
    expect(bestTitle('dystopia', 'Dystopia')).toBe('The best dystopias');
    expect(bestTitle('time-travel', 'Time travel')).toBe(
      'The best time travel series',
    );
    expect(bestTitle('spies', 'Spies')).toBe('The best spy series');
    expect(
      bestTitle('psychological-thrillers', 'Psychological thrillers'),
    ).toBe('The best psychological thrillers');
  });

  it('writes the genres the theme sits in', () => {
    const facts = {
      topGenres: [
        {
          count: 90,
          id: 10765,
          name: 'Sci-Fi & Fantasy',
          percent: 62,
          slug: 'sci-fi-fantasy',
        },
        { count: 70, id: 18, name: 'Drama', percent: 48, slug: 'drama' },
      ],
    } as unknown as ThemeLandingFacts;
    expect(mostlyLine(facts)).toBe('Mostly Sci-Fi & Fantasy, Drama');
    expect(mostlyLine({ ...facts, topGenres: [] })).toBeNull();
  });
});

describe('the Start here pick', () => {
  it('takes the best-rated anthology or miniseries', () => {
    expect(
      pickSpotlight({
        anthology: [show(1, 8.3)],
        best: [show(3, 8.7)],
        miniseries: [show(2, 8.1)],
      }),
    ).toEqual({ kind: 'anthology', show: show(1, 8.3) });
    expect(
      pickSpotlight({
        anthology: [show(1, 7.9)],
        best: [show(3, 8.7)],
        miniseries: [show(2, 8.1)],
      }),
    ).toEqual({ kind: 'miniseries', show: show(2, 8.1) });
    expect(
      pickSpotlight({
        anthology: [],
        best: [show(3, 8.7)],
        miniseries: [show(2, 8)],
      }),
    ).toEqual({ kind: 'miniseries', show: show(2, 8) });
  });

  it("falls back to the theme's best-rated show, or nothing", () => {
    expect(
      pickSpotlight({ anthology: [], best: [show(3, 8.7)], miniseries: [] }),
    ).toEqual({ kind: 'best', show: show(3, 8.7) });
    expect(
      pickSpotlight({ anthology: [], best: [], miniseries: [] }),
    ).toBeNull();
  });

  it('says why in a plain sentence built from the data', () => {
    const data = {
      episodes: 9,
      series: 'dystopia series',
      voteAverage: 8.34,
      voteCount: 5400,
    };
    expect(spotlightReason('anthology', data)).toBe(
      'An anthology: every episode stands alone, so any one is a way in.',
    );
    expect(spotlightReason('miniseries', data)).toBe(
      'A miniseries: 9 episodes, and then it ends.',
    );
    expect(spotlightReason('miniseries', { ...data, episodes: null })).toBe(
      'A miniseries: one season, and then it ends.',
    );
    expect(spotlightReason('best', data)).toBe(
      'The best-rated dystopia series on TMDB: ★ 8.3 from 5,400 votes.',
    );
  });
});
