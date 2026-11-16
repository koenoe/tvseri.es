import { describe, expect, it } from 'vitest';

import {
  cardTitles,
  htmlLang,
  languageName,
  RULE_COLORS,
  scriptTabs,
  toTitleCard,
} from './language';

const frieren = {
  genreIds: [16, 10765],
  id: 209_867,
  originalTitle: '葬送のフリーレン',
  slug: 'frieren',
  title: 'Frieren: Beyond Journey’s End',
  year: 2023,
};

const alice = {
  genreIds: [18, 9648],
  id: 110_316,
  originalTitle: '今際の国のアリス',
  slug: 'alice-in-borderland',
  title: 'Alice in Borderland',
  year: 2020,
};

const monster = {
  genreIds: [16, 80],
  id: 30_981,
  originalTitle: 'MONSTER',
  slug: 'monster',
  title: 'Monster',
  year: 2004,
};

describe('languageName', () => {
  it('names the page in its own script (日本語)', () => {
    expect(languageName('ja')).toEqual({
      code: 'ja',
      english: 'Japanese',
      native: '日本語',
    });
    expect(languageName('ko')?.native).toBe('한국어');
  });

  it('capitalises a native name in a script with capitals', () => {
    expect(languageName('es')).toEqual({
      code: 'es',
      english: 'Spanish',
      native: 'Español',
    });
    expect(languageName('nl')?.native).toBe('Nederlands');
  });

  it('names TMDB’s own codes the runtime doesn’t know', () => {
    expect(languageName('cn')).toEqual({
      code: 'cn',
      english: 'Cantonese',
      native: '廣東話',
    });
  });

  it('is null for a code that isn’t a language landing', () => {
    expect(languageName('zz')).toBeNull();
    expect(languageName('JA')).toBeNull();
  });
});

describe('toTitleCard', () => {
  it('tells Animation from Live action and keeps every script', () => {
    expect(toTitleCard(frieren, 'Sōsō no Furīren')).toEqual({
      color: RULE_COLORS[frieren.id % RULE_COLORS.length],
      id: frieren.id,
      kind: 'Animation',
      slug: 'frieren',
      titles: {
        english: 'Frieren: Beyond Journey’s End',
        native: '葬送のフリーレン',
        romanized: 'Sōsō no Furīren',
      },
      year: 2023,
    });
    expect(toTitleCard(alice, null).kind).toBe('Live action');
  });

  it('romanises to the English title when the API has none', () => {
    expect(toTitleCard(monster, null).titles.romanized).toBe('Monster');
  });
});

describe('cardTitles', () => {
  const card = toTitleCard(frieren, 'Sōsō no Furīren');

  it('writes the chosen script with the other title below, each with its language', () => {
    expect(cardTitles(card, 'native', 'ja')).toEqual({
      lang: 'ja',
      other: 'Frieren: Beyond Journey’s End',
      otherLang: 'en',
      title: '葬送のフリーレン',
    });
    expect(cardTitles(card, 'romanized', 'ja')).toEqual({
      lang: 'ja-Latn',
      other: 'Frieren: Beyond Journey’s End',
      otherLang: 'en',
      title: 'Sōsō no Furīren',
    });
    expect(cardTitles(card, 'english', 'ja')).toEqual({
      lang: 'en',
      other: '葬送のフリーレン',
      otherLang: 'ja',
      title: 'Frieren: Beyond Journey’s End',
    });
  });

  it('tags Cantonese titles yue, not TMDB’s cn', () => {
    expect(cardTitles(card, 'english', 'cn').otherLang).toBe('yue');
    expect(cardTitles(card, 'romanized', 'cn').lang).toBe('yue-Latn');
  });

  it('keeps the line below when both titles match (Monster, Hanzawa Naoki in Rōmaji)', () => {
    expect(cardTitles(toTitleCard(monster, null), 'romanized', 'ja')).toEqual({
      lang: 'ja-Latn',
      other: 'Monster',
      otherLang: 'en',
      title: 'Monster',
    });
  });
});

describe('htmlLang', () => {
  it('passes ISO 639-1 codes through (valid BCP 47)', () => {
    expect(htmlLang('ja')).toBe('ja');
    expect(htmlLang('ko')).toBe('ko');
  });

  it('maps TMDB’s cn (not a language code) to Cantonese, yue', () => {
    expect(htmlLang('cn')).toBe('yue');
  });

  it('gives every language landing a tag the runtime accepts', () => {
    for (const code of ['cn', 'ja', 'zh', 'he', 'bh']) {
      expect(() => Intl.getCanonicalLocales(htmlLang(code))).not.toThrow();
    }
  });
});

describe('scriptTabs', () => {
  it('is 日本語 / Rōmaji / English for Japanese', () => {
    const ja = languageName('ja');
    expect(ja && scriptTabs(ja)).toEqual([
      { key: 'native', label: '日本語', lang: 'ja' },
      { key: 'romanized', label: 'Rōmaji', lang: 'ja-Latn' },
      { key: 'english', label: 'English' },
    ]);
  });

  it('has no romanised tab for a Latin script, and no switch for English', () => {
    const es = languageName('es');
    expect(es && scriptTabs(es).map((tab) => tab.label)).toEqual([
      'Español',
      'English',
    ]);
    const en = languageName('en');
    expect(en && scriptTabs(en)).toEqual([]);
  });

  it('tags a Cantonese switch yue (TMDB’s cn)', () => {
    const cn = languageName('cn');
    expect(cn && scriptTabs(cn)[0]?.lang).toBe('yue');
  });

  it('calls romanised titles “Romanised” outside Japanese', () => {
    const ko = languageName('ko');
    expect(ko && scriptTabs(ko)[1]?.label).toBe('Romanised');
  });
});
