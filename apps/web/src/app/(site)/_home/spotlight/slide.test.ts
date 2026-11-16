import type { TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { TRENDING } from '../../../../../e2e/fixtures/home/core';
import { toSlide } from './slide';

const at = (index: number): TvSeries => {
  const series = TRENDING[index];
  if (!series) {
    throw new Error(`no fixture at ${index}`);
  }
  return series;
};

describe('toSlide', () => {
  it('keeps what the slide draws', () => {
    const slide = toSlide(at(0), 0);
    expect(slide.rank).toBe('#1 trending this week');
    expect(slide.title).toBe('Pluribus');
    expect(slide.year).toBe('2025');
    expect(slide.seasons).toBe('1 season');
    expect(slide.genre).toBe('Sci-Fi & Fantasy');
    expect(slide.hook).toBe(
      'Vince Gilligan’s first show since Better Call Saul',
    );
    expect(slide.color).toBe('#212628');
    expect(slide.href).toBe('/225171/pluribus');
  });

  it('ranks by place and counts seasons in the plural', () => {
    const slide = toSlide(at(5), 5);
    expect(slide.rank).toBe('#6 trending this week');
    expect(slide.seasons).toBe('5 seasons');
    expect(slide.logo).toBe('');
    expect(slide.hook).toBe('Ended: 5 seasons, 42 episodes');
  });

  it('carries the logo’s aspect ratio when the API sends one', () => {
    expect(toSlide(at(0), 0).logoRatio).toBe(2.5);
    expect(toSlide(at(2), 2).logoRatio).toBeNull();
    // without a logo, or with a ratio that can't size a box: none
    expect(
      toSlide(
        { ...at(0), titleTreatmentAspectRatio: 3, titleTreatmentImage: '' },
        0,
      ).logoRatio,
    ).toBeNull();
    for (const ratio of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        toSlide({ ...at(0), titleTreatmentAspectRatio: ratio }, 0).logoRatio,
      ).toBeNull();
    }
  });

  it('writes the hook line for every trending show', () => {
    expect(
      TRENDING.map(
        (series, index) => toSlide(series, index, '2026-11-11').hook,
      ),
    ).toEqual([
      'Vince Gilligan’s first show since Better Call Saul',
      'Everyone in this town is hiding something.',
      'A brilliant but troubled detective is put in charge of a new cold-case unit in the…',
      'Follow the staff of a Pittsburgh trauma centre through a single fifteen-hour shift, hour…',
      'With Tom Hardy, Helen Mirren and Pierce Brosnan',
      'Ended: 5 seasons, 42 episodes',
      'From Bill Hader and Alec Berg',
      'Every episode is a whole story.',
      'Season 4 premieres Nov 17',
      '',
    ]);
  });

  it('turns an unsafe colour into the ground', () => {
    const slide = toSlide({ ...at(0), backdropColor: 'red;}' }, 0);
    expect(slide.color).toBe('#1c2223');
  });

  it('has no seasons label without seasons', () => {
    expect(toSlide({ ...at(0), numberOfSeasons: 0 }, 0).seasons).toBe('');
  });
});
