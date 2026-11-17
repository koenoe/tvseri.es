import { landingFilter } from '@tvseri.es/constants';
import { languageName as nameOf } from '@tvseri.es/utils';

/** A language as the landing names it */
export type LanguageName = Readonly<{
  code: string;
  /** in its own script: "日本語", the page's title */
  native: string;
  /** "Japanese" */
  english: string;
}>;

/** TMDB codes that aren't ISO 639-1, which the runtime can't name */
const OVERRIDES: Readonly<Record<string, Omit<LanguageName, 'code'>>> = {
  cn: { english: 'Cantonese', native: '廣東話' },
};

/**
 * The page name in its own script ("日本語") and in English,
 * from the runtime's language names (`Intl.DisplayNames`, CLDR), so the
 * title needs no API call and sits in the cached shell. Native names start
 * with a capital where the script has them ("español" → "Español"). Null
 * for a code that isn't a language landing.
 */
export function languageName(code: string): LanguageName | null {
  if (!landingFilter('language', code)) {
    return null;
  }
  const override = OVERRIDES[code];
  if (override) {
    return { code, ...override };
  }
  const english = nameOf(code) ?? code;
  const own = nameOf(code, code) ?? english;
  const native = own.charAt(0).toLocaleUpperCase(code) + own.slice(1);
  return { code, english, native };
}
