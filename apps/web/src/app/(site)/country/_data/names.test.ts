import { describe, expect, it } from 'vitest';

import { countryNames } from './names';

describe('countryNames', () => {
  it('names the United Kingdom in English only (its own name is the same)', () => {
    expect(countryNames('gb')).toEqual({
      code: 'GB',
      language: 'en',
      languageName: 'English',
      name: 'United Kingdom',
      native: '',
      prose: 'the United Kingdom',
      proseShort: 'the UK',
    });
  });

  it('adds the own-language name for South Korea and Denmark', () => {
    expect(countryNames('kr')).toMatchObject({
      languageName: 'Korean',
      name: 'South Korea',
      native: '대한민국',
    });
    expect(countryNames('DK')).toMatchObject({
      language: 'da',
      languageName: 'Danish',
      name: 'Denmark',
      native: 'Danmark',
    });
  });
});

describe('the names in a sentence (“New from the UK”, “That’s the United Kingdom”)', () => {
  it.each([
    ['gb', 'the United Kingdom', 'the UK'],
    ['us', 'the United States', 'the US'],
    ['nl', 'the Netherlands', 'the Netherlands'],
    ['ae', 'the United Arab Emirates', 'the United Arab Emirates'],
    ['dk', 'Denmark', 'Denmark'],
    ['kr', 'South Korea', 'South Korea'],
  ])('%s: %s, short %s', (code, prose, proseShort) => {
    expect(countryNames(code)).toMatchObject({ prose, proseShort });
  });
});
