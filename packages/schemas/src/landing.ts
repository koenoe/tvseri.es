import type { TvSeries } from './tv-series';

/** A genre next to the landing's subject, with its share of the shows */
export type LandingGenreShare = Readonly<{
  id: number;
  slug: string;
  name: string;
  /** Shows with both the landing's tag and this genre */
  count: number;
  /** `count` as a whole percentage of the landing's shows */
  percent: number;
}>;

/** A theme (TMDB keyword) with its own landing, `/theme/{slug}` */
export type LandingThemeChip = Readonly<{
  id: number;
  slug: string;
  name: string;
  /** Shows with the landing's tag and this theme (see each facts type) */
  count: number;
}>;

/** One option of a landing row's switch, with the discover filter it applies */
export type LandingSwitchOption = Readonly<{
  key: string;
  label: string;
  count: number;
  filter: Readonly<Record<string, string>>;
}>;

type LandingFactsBase<Type extends string> = Readonly<{
  type: Type;
  slug: string;
  /** Every show of the landing on TMDB (with at least one air date) */
  count: number;
}>;

export type GenreLandingFacts = LandingFactsBase<'genre'> &
  Readonly<{
    /** The other genres most often shared with this one, biggest first (up to 3) */
    alsoWith: ReadonlyArray<LandingGenreShare>;
    /** The decade in which most of the genre's shows started; null without shows */
    peakDecade: Readonly<{ slug: string; count: number }> | null;
    /** Shows that first aired in the last 12 months */
    newLastYear: number;
    /** Sub-genre chips: themes shared with the genre, `count` = shows with both (up to 6) */
    subGenres: ReadonlyArray<LandingThemeChip>;
    /** "By kind" tabs: the first four chips with at least 12 shows */
    byKind: ReadonlyArray<LandingThemeChip>;
  }>;

export type ThemeLandingFacts = LandingFactsBase<'theme'> &
  Readonly<{
    /** The genres most often shared with the theme (up to 2) */
    topGenres: ReadonlyArray<LandingGenreShare>;
    /** "Often tagged with": themes shared with this one, `count` = shows with both (up to 6) */
    oftenTaggedWith: ReadonlyArray<LandingThemeChip>;
    /** "Next door" tabs: `count` = shows with that theme but not this one, at least 12 (up to 4) */
    nextDoor: ReadonlyArray<LandingThemeChip>;
  }>;

export type NetworkLandingFacts = LandingFactsBase<'network'> &
  Readonly<{
    /** The switch of "The best of": decades when 2+ of them hold 6+ shows, else genres */
    bestBy: Readonly<{
      kind: 'decades' | 'genres';
      options: ReadonlyArray<LandingSwitchOption>;
    }>;
    /**
     * Shows whose first listed network is this one, found among the network's
     * most popular `scanned` shows. `found` is the exact number of originals
     * when `exact` (every show was scanned); `items` holds the first 20 with a poster.
     */
    originals: Readonly<{
      found: number;
      scanned: number;
      exact: boolean;
      items: ReadonlyArray<TvSeries>;
    }>;
  }>;

export type CountryLandingFacts = LandingFactsBase<'country'> &
  Readonly<{
    /**
     * "Made for": the networks with most shows made in the country (at least 12
     * each, up to 6). Empty when fewer than 3 qualify, so the switch is hidden.
     */
    madeFor: ReadonlyArray<
      Readonly<{ id: number; slug: string; name: string; count: number }>
    >;
  }>;

export type DecadeLandingFacts = LandingFactsBase<'decade'>;
export type LanguageLandingFacts = LandingFactsBase<'language'>;

export type LandingFacts =
  | GenreLandingFacts
  | ThemeLandingFacts
  | NetworkLandingFacts
  | CountryLandingFacts
  | DecadeLandingFacts
  | LanguageLandingFacts;

/**
 * `GET /discover/landing/:type/counts?slugs=a,b,c`: every show of each landing
 * on TMDB (the same number as its facts' `count`, without computing the
 * facts). Unknown slugs are left out.
 */
export type LandingCounts = Readonly<{
  counts: Readonly<Record<string, number>>;
}>;
