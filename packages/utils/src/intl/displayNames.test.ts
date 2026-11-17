import { describe, expect, it } from 'vitest';

import { countryInSentence, languageName, regionName } from './displayNames';

const inSentence = (code: string, style?: 'long' | 'short') =>
  countryInSentence(regionName(code, { style }));

describe('regionName', () => {
  it('names a region in English, long or short', () => {
    expect(regionName('GB')).toBe('United Kingdom');
    expect(regionName('gb', { style: 'short' })).toBe('UK');
  });

  it('names a region in another language', () => {
    expect(regionName('DK', { locale: 'da' })).toBe('Danmark');
  });

  it('falls back to the upper-case code', () => {
    expect(regionName('xx')).toBe('XX');
    expect(regionName('not a code')).toBe('NOT A CODE');
    expect(regionName('GB', { locale: '!!' })).toBe('GB');
  });
});

describe('languageName', () => {
  it('names a language, in English or in another language', () => {
    expect(languageName('ja')).toBe('Japanese');
    expect(languageName('ja', 'ja')).toBe('日本語');
  });

  it('is undefined for a code without a name', () => {
    expect(languageName('qqq')).toBeUndefined();
    expect(languageName('not a code')).toBeUndefined();
  });
});

describe('countryInSentence', () => {
  it('puts "the" before plural and union names', () => {
    for (const [code, prose] of [
      ['BS', 'the Bahamas'],
      ['NL', 'the Netherlands'],
      ['PH', 'the Philippines'],
      ['GM', 'the Gambia'],
      ['US', 'the United States'],
      ['GB', 'the United Kingdom'],
      ['AE', 'the United Arab Emirates'],
      ['MV', 'the Maldives'],
      ['SC', 'the Seychelles'],
      ['KM', 'the Comoros'],
      ['MH', 'the Marshall Islands'],
      ['SB', 'the Solomon Islands'],
      ['KY', 'the Cayman Islands'],
      ['FO', 'the Faroe Islands'],
      ['FK', 'the Falkland Islands'],
      ['CF', 'the Central African Republic'],
      ['DO', 'the Dominican Republic'],
      ['CD', 'the Congo - Kinshasa'],
      ['CG', 'the Congo - Brazzaville'],
    ]) {
      expect(inSentence(code!)).toBe(prose);
    }
  });

  it('uses the short name\'s own article: "the UK", "Pitcairn"', () => {
    expect(inSentence('GB', 'short')).toBe('the UK');
    expect(inSentence('US', 'short')).toBe('the US');
    expect(inSentence('PN')).toBe('the Pitcairn Islands');
    expect(inSentence('PN', 'short')).toBe('Pitcairn');
    expect(inSentence('PS')).toBe('the Palestinian Territories');
    expect(inSentence('PS', 'short')).toBe('Palestine');
  });

  it('leaves single names bare', () => {
    expect(inSentence('CZ')).toBe('Czechia');
    expect(inSentence('VA')).toBe('Vatican City');
    expect(inSentence('DE')).toBe('Germany');
    expect(inSentence('KR')).toBe('South Korea');
    expect(inSentence('XX')).toBe('XX');
  });

  it("reads an older runtime's names right", () => {
    expect(countryInSentence('Czech Republic')).toBe('the Czech Republic');
    expect(countryInSentence('Democratic Republic of the Congo')).toBe(
      'the Democratic Republic of the Congo',
    );
    expect(countryInSentence('Republic of the Congo')).toBe(
      'the Republic of the Congo',
    );
  });
});
