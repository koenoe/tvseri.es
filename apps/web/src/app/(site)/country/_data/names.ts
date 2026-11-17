/**
 * What a country landing says about the country: its English
 * name ("United Kingdom", "South Korea"), its name in its own main language
 * ("대한민국", "Danmark"; empty when that is the English name) and that
 * language ("Mostly in Korean"). From the Intl APIs (CLDR), so every ISO code
 * works without a table: the main language is CLDR's likely language for the
 * region.
 */

import { countryInSentence, languageName, regionName } from '@tvseri.es/utils';

export type CountryNames = Readonly<{
  /** upper-case ISO 3166-1 alpha-2 */
  code: string;
  name: string;
  /** the name in `language`; '' when it is the English name */
  native: string;
  /** ISO 639-1 of the country's likely main language, '' when unknown */
  language: string;
  /** "English", "Korean"; '' when unknown */
  languageName: string;
  /** the name in a sentence: "the United Kingdom", "Denmark" */
  prose: string;
  /** CLDR's short name in a sentence: "the UK" (the phone's "New from the UK") */
  proseShort: string;
}>;

const likelyLanguage = (code: string) => {
  try {
    const { language } = new Intl.Locale(`und-${code}`).maximize();
    return language === 'und' ? '' : language;
  } catch {
    return '';
  }
};

export function countryNames(isoCode: string): CountryNames {
  const code = isoCode.toUpperCase();
  const name = regionName(code);
  const language = likelyLanguage(code);
  const own = language ? regionName(code, { locale: language }) : undefined;
  return {
    code,
    language,
    languageName: language ? (languageName(language) ?? '') : '',
    name,
    native: own && own !== name ? own : '',
    prose: countryInSentence(name),
    proseShort: countryInSentence(regionName(code, { style: 'short' })),
  };
}
