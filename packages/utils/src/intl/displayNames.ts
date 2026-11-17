/**
 * Country and language names from the runtime (`Intl.DisplayNames`, CLDR),
 * so every ISO code works without a table. One cached formatter per locale,
 * type and style, built on first use: constructing one is relatively
 * expensive. Never throws: a malformed code or locale reads as "no name".
 */

type NameStyle = 'long' | 'short';

const formatters = new Map<string, Intl.DisplayNames | null>();

const formatterFor = (
  locale: string,
  type: 'language' | 'region',
  style: NameStyle,
): Intl.DisplayNames | null => {
  const key = `${locale}|${type}|${style}`;
  let formatter = formatters.get(key);
  if (formatter === undefined) {
    try {
      formatter = new Intl.DisplayNames([locale], { style, type });
    } catch {
      formatter = null;
    }
    formatters.set(key, formatter);
  }
  return formatter;
};

const nameOf = (
  code: string,
  locale: string,
  type: 'language' | 'region',
  style: NameStyle,
): string | undefined => {
  try {
    return formatterFor(locale, type, style)?.of(code);
  } catch {
    return undefined;
  }
};

/**
 * "GB" → "United Kingdom" (`short`: "UK"), in English unless `locale` says
 * otherwise. The upper-case code itself when the runtime has no name for it.
 */
export function regionName(
  code: string,
  {
    locale = 'en',
    style = 'long',
  }: Readonly<{ locale?: string; style?: NameStyle }> = {},
): string {
  const upper = code.toUpperCase();
  return nameOf(upper, locale, 'region', style) ?? upper;
}

/**
 * "ja" → "Japanese" (in `locale`, English by default); `undefined` when the
 * runtime has no name for the code.
 */
export function languageName(code: string, locale = 'en'): string | undefined {
  const name = nameOf(code, locale, 'language', 'long');
  return name && name !== code ? name : undefined;
}

/**
 * English country names that take "the" in a sentence: plural and union
 * names ("the Netherlands", "the United Kingdom", "the Czech Republic", "the
 * Cayman Islands", "the Congo"), not "Czechia" or "Vatican City". Matched on
 * the name, not the code, so a runtime with older names ("Czech Republic")
 * and short names ("UK", but "Pitcairn" for "Pitcairn Islands") read right.
 * `regionLine` (web) carries a copy, as its source is embedded in a
 * pre-paint script; its test pins the two together.
 */
export const TAKES_THE =
  /^(?:U[KS]|UAE|USA|United .+|.+ (?:Islands|Republic|Emirates|Territories)|(?:Caribbean )?Netherlands|Bahamas|Philippines|Gambia|Maldives|Seychelles|Comoros|Congo(?: .+)?|(?:Democratic )?Republic of .+|Holy See)$/;

/** A country's English name in a sentence: "the Netherlands", "Germany" */
export const countryInSentence = (name: string): string =>
  TAKES_THE.test(name) ? `the ${name}` : name;
