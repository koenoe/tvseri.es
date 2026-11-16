import { landingFilter } from '@tvseri.es/constants';

import type { TileShow } from '../../../_discover/data/tileShow';

/** A language as the landing names it */
export type LanguageName = Readonly<{
  code: string;
  /** in its own script: "日本語", the page's title */
  native: string;
  /** "Japanese" */
  english: string;
}>;

/**
 * A TMDB language code as an HTML `lang` (BCP 47). TMDB's codes are ISO
 * 639-1 (valid primary subtags) except `cn`, its Cantonese, which is `yue`.
 */
export const htmlLang = (code: string): string =>
  code === 'cn' ? 'yue' : code;

/** TMDB codes that aren't ISO 639-1, which the runtime can't name */
const OVERRIDES: Readonly<Record<string, Omit<LanguageName, 'code'>>> = {
  cn: { english: 'Cantonese', native: '廣東話' },
};

const displayName = (locale: string, code: string): string | undefined => {
  try {
    const name = new Intl.DisplayNames([locale], { type: 'language' }).of(code);
    return name && name !== code ? name : undefined;
  } catch {
    return undefined;
  }
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
  const english = displayName('en', code) ?? code;
  const own = displayName(code, code) ?? english;
  const native = own.charAt(0).toLocaleUpperCase(code) + own.slice(1);
  return { code, english, native };
}

/** The script switch's tabs (日本語 / Rōmaji / English) */
export type Script = 'english' | 'native' | 'romanized';

export type TitleCard = Readonly<{
  id: number;
  slug: string;
  /** the title in each script */
  titles: Readonly<Record<Script, string>>;
  year: number | null;
  kind: 'Animation' | 'Live action';
  /** the coloured top rule */
  color: string;
}>;

/** TMDB's Animation genre */
const ANIMATION = 16;

/**
 * The top rules' colours: the design's (the API has no colour per show),
 * one per show by its id, so a show keeps its colour.
 */
export const RULE_COLORS = [
  '#7fa6b8',
  '#9a7550',
  '#b04a3a',
  '#4a6a9a',
  '#d9a441',
  '#c7a24a',
  '#6a8a5a',
  '#8a8a8a',
  '#d8d050',
  '#c48a3a',
  '#4a6a8a',
  '#b23a48',
  '#d98a9a',
] as const;

/**
 * A title-wall card: the title as it was written, its
 * romanised form (the API's, else the English title, as the design falls
 * back) and the English title; Animation or Live action from the genres.
 */
export function toTitleCard(
  show: Pick<
    TileShow,
    'genreIds' | 'id' | 'originalTitle' | 'slug' | 'title' | 'year'
  >,
  romanized: string | null | undefined,
): TitleCard {
  return {
    color: RULE_COLORS[show.id % RULE_COLORS.length] ?? RULE_COLORS[0],
    id: show.id,
    kind: show.genreIds.includes(ANIMATION) ? 'Animation' : 'Live action',
    slug: show.slug,
    titles: {
      english: show.title,
      native: show.originalTitle || show.title,
      romanized: romanized || show.title,
    },
    year: show.year,
  };
}

/**
 * The card's two lines in a script, each with its HTML `lang`: the title,
 * and the other title below (the English one, or the original in English),
 * even when they read the same (the design keeps "Monster" under
 * "Monster" in Rōmaji). `code` is the landing's language (TMDB's code).
 */
export function cardTitles(
  card: Pick<TitleCard, 'titles'>,
  script: Script,
  code: string,
): Readonly<{
  lang: string;
  other: string;
  otherLang: string;
  title: string;
}> {
  const own = htmlLang(code);
  const title = card.titles[script];
  const english = script === 'english';
  const other = english ? card.titles.native : card.titles.english;
  const lang = english ? 'en' : script === 'romanized' ? `${own}-Latn` : own;
  return {
    lang,
    other,
    otherLang: english ? own : 'en',
    title,
  };
}

export type ScriptTab = Readonly<{
  key: Script;
  label: string;
  /** the label's language when it isn't the page's English (日本語, Rōmaji) */
  lang?: string;
}>;

/** Any letter outside the Latin script: the language needs a romanisation */
const NOT_LATIN = /[^\p{Script=Latin}\P{L}]/u;

/**
 * The switch's tabs, known from the language alone (no API call, so the
 * switch is in the cached shell): its own script always; the romanised one
 * when that script isn't Latin ("Rōmaji" for Japanese, "Romanised"
 * elsewhere); English unless the language is English. No switch (one tab)
 * for English.
 */
export function scriptTabs(language: LanguageName): ReadonlyArray<ScriptTab> {
  const own = htmlLang(language.code);
  const tabs: ScriptTab[] = [
    { key: 'native', label: language.native, lang: own },
  ];
  if (NOT_LATIN.test(language.native)) {
    // "Rōmaji" is a Japanese word in Latin letters; "Romanised" is English
    tabs.push(
      language.code === 'ja'
        ? { key: 'romanized', label: 'Rōmaji', lang: `${own}-Latn` }
        : { key: 'romanized', label: 'Romanised' },
    );
  }
  if (language.code !== 'en') {
    tabs.push({ key: 'english', label: 'English' });
  }
  return tabs.length > 1 ? tabs : [];
}
