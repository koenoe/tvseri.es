/**
 * What a country landing says about the country: its English
 * name ("United Kingdom", "South Korea"), its name in its own main language
 * ("대한민국", "Danmark"; empty when that is the English name) and that
 * language ("Mostly in Korean"). From the Intl APIs (CLDR), so every ISO code
 * works without a table: the main language is CLDR's likely language for the
 * region.
 */

const ENGLISH_REGIONS = new Intl.DisplayNames('en', { type: 'region' });
const SHORT_REGIONS = new Intl.DisplayNames('en', {
  style: 'short',
  type: 'region',
});

/** English names that take "the" in a sentence ("New from the UK") */
const WITH_THE =
  /^(?:[A-Z]{2,3}|United .+|.+ (?:Republic|Islands|Emirates)|Netherlands|Philippines|Bahamas|Gambia|Maldives|Comoros|Seychelles)$/;

const inSentence = (name: string) =>
  WITH_THE.test(name) ? `the ${name}` : name;
const ENGLISH_LANGUAGES = new Intl.DisplayNames('en', { type: 'language' });

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
  const name = ENGLISH_REGIONS.of(code) ?? code;
  const language = likelyLanguage(code);
  const own = language
    ? new Intl.DisplayNames(language, { type: 'region' }).of(code)
    : undefined;
  return {
    code,
    language,
    languageName: language ? (ENGLISH_LANGUAGES.of(language) ?? '') : '',
    name,
    native: own && own !== name ? own : '',
    prose: inSentence(name),
    proseShort: inSentence(SHORT_REGIONS.of(code) ?? name),
  };
}
