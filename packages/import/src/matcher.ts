import type {
  Episode,
  EpisodeOption,
  ImportCell,
  ImportRow,
  MatchProblem,
  Season,
  SeriesCandidate,
  TvSeries,
} from '@tvseri.es/schemas';
import { toSlug } from '@tvseri.es/utils';
import { diceCoefficient } from 'dice-coefficient';

import {
  cutPrefix,
  parseEpisodeNumber,
  recogniseSeasonNumber,
} from './parseEntry';

/**
 * The matching rules' version: bump it with any change to how rows are
 * matched (this file, ./parseEntry.ts, a service's row reader). A sync
 * re-checks a connection's open review entries once per version, so
 * entries an older matcher couldn't settle get one more try.
 */
export const MATCHER_VERSION = 1;

const DICE_COEFFICIENT_THRESHOLD = 0.75;
// Slugs shorter than this (e.g. '' for CJK titles) would "contain" anything
const MIN_FUZZY_SLUG_LENGTH = 3;
const MAX_CANDIDATES = 4;
const MAX_EPISODE_OPTIONS = 60;

export type Catalog = Readonly<{
  searchTvSeries: (title: string) => Promise<ReadonlyArray<TvSeries>>;
  getTvSeries: (id: number) => Promise<TvSeries | null | undefined>;
  getSeason: (
    id: number,
    seasonNumber: number,
  ) => Promise<Season | null | undefined>;
}>;

type Match = 'exact' | 'similar' | 'none';

export const compareTitles = (a: string, b: string): Match => {
  const slugA = toSlug(a);
  const slugB = toSlug(b);
  if (
    slugA ? slugA === slugB : a.trim().toLowerCase() === b.trim().toLowerCase()
  ) {
    return 'exact';
  }
  if (
    slugA.length < MIN_FUZZY_SLUG_LENGTH ||
    slugB.length < MIN_FUZZY_SLUG_LENGTH
  ) {
    return 'none';
  }
  return slugA.includes(slugB) ||
    slugB.includes(slugA) ||
    diceCoefficient(slugA, slugB) > DICE_COEFFICIENT_THRESHOLD
    ? 'similar'
    : 'none';
};

/**
 * A title as loose matching compares it: its slug past a leading article
 * ("The Cat’s in the Bag" and TMDB's "Cat's in the Bag..."). Never empty
 * for a title that has a slug: "The" alone keeps its article.
 */
const looseKey = (title: string) =>
  toSlug(title).replace(/^(?:the|a|an)-(?=.)/, '');

/** The same title past case, punctuation, quotes, an ellipsis and a leading article */
const isLooseMatch = (a: string, b: string) => {
  const key = looseKey(a);
  return key !== '' && key === looseKey(b);
};

/**
 * A text Netflix cut short ("Biggest...") against a full title: `exact` only
 * for a title that ends in the ellipsis itself ("And Just Like That..."),
 * `prefix` for one that starts with the text before the cut, compared as
 * exact matching compares (slugs; the text itself when it has no slug).
 */
const cutFit = (
  title: string,
  text: string,
  cut: string,
): 'exact' | 'prefix' | 'none' => {
  if (cutPrefix(title) !== null && compareTitles(title, text) === 'exact') {
    return 'exact';
  }
  const slug = toSlug(cut);
  const starts = slug
    ? toSlug(title).startsWith(slug)
    : cut.trim() !== '' &&
      title.trim().toLowerCase().startsWith(cut.trim().toLowerCase());
  return starts ? 'prefix' : 'none';
};

export const normalizeTitle = (title: string) =>
  title
    .toLowerCase()
    // TMDB search doesn't handle "(TV)" or the U.K./U.S. abbreviations well
    .replace('(tv)', '')
    .replace(/\(u\.k\.\)/g, '(uk)')
    .replace(/\(u\.s\.\)/g, '(us)')
    .trim();

/** Netflix's "(U.K.)" is TMDB's GB */
const COUNTRY_OF_TAG: Readonly<Record<string, string>> = {
  uk: 'GB',
  usa: 'US',
};

type Tag = Readonly<{
  /** The title without its tag */
  base: string;
  /** Whether a series is the one the tag names */
  fits: (series: TvSeries) => boolean;
}>;

/**
 * The tag Netflix adds to tell namesakes apart, after `normalizeTitle`: a
 * country ("the office (uk)") or a first-air year ("the office (2005)").
 * Null for a title without one, or with any other parenthetical.
 */
const readTag = (title: string): Tag | null => {
  const match = /^(.+?)\s*\((\d{4}|[a-z]{2}|usa)\)$/.exec(title);
  if (!match) {
    return null;
  }
  const base = match[1]!;
  const tag = match[2]!;
  if (/^\d{4}$/.test(tag)) {
    return {
      base,
      fits: (series) =>
        (series.firstAirDate?.slice(0, 4) || series.releaseYear) === tag,
    };
  }
  const code = COUNTRY_OF_TAG[tag] ?? tag.toUpperCase();
  return { base, fits: (series) => series.originCountry?.code === code };
};

const toCandidate = (series: TvSeries): SeriesCandidate => ({
  id: series.id,
  network: series.network?.name ?? series.originCountry?.name ?? null,
  posterImage: series.posterImage || null,
  title: series.title,
  year: series.releaseYear || series.firstAirDate?.slice(0, 4) || null,
});

/**
 * The search results a title names: those with exactly its name, or, for a
 * title Netflix cut short, those with exactly its name (ellipsis and all),
 * else those it starts.
 */
const named = (
  results: ReadonlyArray<TvSeries>,
  title: string,
): ReadonlyArray<TvSeries> => {
  const cut = cutPrefix(title);
  if (cut === null) {
    return results.filter(
      (result) => compareTitles(result.title, title) === 'exact',
    );
  }
  const exact = results.filter(
    (result) => cutFit(result.title, title, cut) === 'exact',
  );
  return exact.length > 0
    ? exact
    : results.filter((result) => cutFit(result.title, title, cut) === 'prefix');
};

export type MatchResult =
  | Readonly<{
      kind: 'matched';
      tvSeries: TvSeries;
      episode: Episode;
      seasonNumber: number;
    }>
  | Readonly<{ kind: 'problem'; problem: MatchProblem }>;

type Found = Readonly<{ episode: Episode; seasonNumber: number }>;

/**
 * What a series says about a row's episode: the one episode it certainly is
 * (`found`), or none, and whether some title is only similar (that ranks the
 * series and the episodes the user picks from, never more).
 */
type Lookup = Readonly<{ found: Found | null; hasSimilar: boolean }>;

const NOTHING: Lookup = { found: null, hasSimilar: false };

type Target = Readonly<{
  /** The season the row names; null: none or one we can't read (any season) */
  season: number | null;
  episode: ImportCell;
}>;

const toOption = ({ episode, seasonNumber }: Found): EpisodeOption => ({
  episodeNumber: episode.episodeNumber,
  seasonNumber,
  title: episode.title,
});

const isNumeric = (cell: ImportCell) =>
  typeof cell === 'number' || /^\d+$/.test(cell.trim());

/**
 * How an episode fits the row's episode cell. Only `exact` (the title, as a
 * slug), `numbered` (a plain or labelled number), the one `prefix` (a title
 * Netflix cut short starts it) and the one `loose` (the title past a leading
 * article) are ever matched; `similar` only ranks.
 */
type Fit = 'exact' | 'loose' | 'numbered' | 'prefix' | 'similar' | 'none';

const FIT_RANK: Readonly<Record<Fit, number>> = {
  exact: 0,
  loose: 1,
  none: 5,
  numbered: 2,
  prefix: 3,
  similar: 4,
};

/** How strongly a found episode says its series is the row's: lower is stronger */
const EVIDENCE_TIER: Readonly<Record<Fit, number>> = {
  exact: 0,
  loose: 1,
  none: 2,
  numbered: 2,
  prefix: 2,
  similar: 2,
};

const fitOf = (episode: Episode, cell: ImportCell): Fit => {
  const cut = typeof cell === 'string' ? cutPrefix(cell) : null;
  // A number at the cut is never read: "Episode 1..." may be Episode 12
  if (cut !== null) {
    return cutFit(episode.title, String(cell).trim(), cut);
  }
  const number = parseEpisodeNumber(cell);
  if (isNumeric(cell)) {
    return episode.episodeNumber === number ? 'numbered' : 'none';
  }
  const byTitle = compareTitles(episode.title, String(cell).trim());
  if (byTitle === 'exact') {
    return 'exact';
  }
  if (number !== null && episode.episodeNumber === number) {
    return 'numbered';
  }
  return isLooseMatch(episode.title, String(cell)) ? 'loose' : byTitle;
};

const hasFit = (episodes: ReadonlyArray<Found>, cell: ImportCell, fit: Fit) =>
  episodes.some(({ episode }) => fitOf(episode, cell) === fit);

/**
 * The one episode with this fit (a cut title starts it, or its title is the
 * cell's past an article); several are doubtful, none is nothing.
 */
const lookupOnly = (
  episodes: ReadonlyArray<Found>,
  cell: ImportCell,
  fit: 'loose' | 'prefix',
): Lookup | null => {
  const fitting = episodes.filter(
    ({ episode }) => fitOf(episode, cell) === fit,
  );
  if (fitting.length === 0) {
    return null;
  }
  return fitting.length === 1
    ? { found: fitting[0]!, hasSimilar: false }
    : { found: null, hasSimilar: true };
};

/**
 * One season: its exact title, else its numbered episode, else the one a
 * cut title starts, else the one loose title.
 */
const lookupIn = (episodes: ReadonlyArray<Found>, cell: ImportCell): Lookup => {
  const found =
    episodes.find(({ episode }) => fitOf(episode, cell) === 'exact') ??
    episodes.find(({ episode }) => fitOf(episode, cell) === 'numbered') ??
    null;
  if (found) {
    return { found, hasSimilar: false };
  }
  return (
    lookupOnly(episodes, cell, 'prefix') ??
    lookupOnly(episodes, cell, 'loose') ?? {
      found: null,
      hasSimilar: hasFit(episodes, cell, 'similar'),
    }
  );
};

/**
 * Best fit first: exact, numbered, similar (closest title first), the rest;
 * otherwise in show order.
 */
const rankEpisodes = (episodes: ReadonlyArray<Found>, cell: ImportCell) => {
  const text = toSlug(String(cell));
  return episodes
    .map((found) => {
      const fit = fitOf(found.episode, cell);
      return {
        found,
        rank: FIT_RANK[fit],
        score:
          fit === 'similar'
            ? diceCoefficient(toSlug(found.episode.title), text)
            : 0,
      };
    })
    .sort((a, b) => a.rank - b.rank || b.score - a.score)
    .map(({ found }) => found);
};

/**
 * Matches import rows to catalogue episodes. Create one per request: the maps
 * here only dedupe lookups within a request (cross-request caching belongs in
 * the catalogue, e.g. `'use cache'`). Searches are shared per normalised
 * title; which series a row means is decided per row, by its season and
 * episode. Only an exact episode title or an episode number is a match; a
 * similar title, or a number without a season we can read on a show with
 * several seasons, comes back as a problem for the user to settle.
 */
export const createEpisodeMatcher = (catalog: Catalog) => {
  const searches = new Map<string, Promise<ReadonlyArray<TvSeries>>>();
  const seriesById = new Map<number, Promise<TvSeries | null>>();
  const seasons = new Map<string, Promise<Season | null>>();

  const search = (title: string) => {
    let pending = searches.get(title);
    if (!pending) {
      pending = catalog.searchTvSeries(title);
      searches.set(title, pending);
    }
    return pending;
  };

  const getSeries = (id: number) => {
    let pending = seriesById.get(id);
    if (!pending) {
      pending = catalog.getTvSeries(id).then((series) => series ?? null);
      seriesById.set(id, pending);
    }
    return pending;
  };

  const getSeason = (id: number, seasonNumber: number) => {
    const key = `${id}-${seasonNumber}`;
    let pending = seasons.get(key);
    if (!pending) {
      pending = catalog.getSeason(id, seasonNumber).then((s) => s ?? null);
      seasons.set(key, pending);
    }
    return pending;
  };

  /** A cut title ("Biggest...") is searched for the text before the cut */
  const searchFor = (title: string) => search(cutPrefix(title) ?? title);

  const seasonNumbersOf = (series: TvSeries): ReadonlyArray<number> => {
    const listed = series.seasons?.map((season) => season.seasonNumber);
    if (listed?.length) {
      return [...listed].sort((a, b) => a - b);
    }
    return Array.from({ length: series.numberOfSeasons }, (_, i) => i + 1);
  };

  /** The season's episodes, paired with the season they were asked for. */
  const episodesIn = async (
    series: TvSeries,
    seasonNumber: number,
  ): Promise<ReadonlyArray<Found>> =>
    ((await getSeason(series.id, seasonNumber))?.episodes ?? []).map(
      (episode) => ({ episode, seasonNumber }),
    );

  const allEpisodes = async (
    series: TvSeries,
  ): Promise<ReadonlyArray<Found>> => {
    const all: Found[] = [];
    for (const seasonNumber of seasonNumbersOf(series)) {
      all.push(...(await episodesIn(series, seasonNumber)));
    }
    return all;
  };

  /** The show's only regular season (specials aside), if it has one. */
  const onlySeasonOf = (series: TvSeries): number | null => {
    const regular = seasonNumbersOf(series).filter((n) => n >= 1);
    return regular.length === 1 ? regular[0]! : null;
  };

  const lookup = async (
    series: TvSeries,
    { season, episode }: Target,
  ): Promise<Lookup> => {
    if (season !== null) {
      return lookupIn(await episodesIn(series, season), episode);
    }
    // No season we can read: a number only means something when the show has
    // one regular season
    const onlySeason = onlySeasonOf(series);
    if (isNumeric(episode)) {
      return onlySeason === null
        ? NOTHING
        : lookupIn(await episodesIn(series, onlySeason), episode);
    }
    // An episode title in every season; the same title in two is doubtful
    const all = await allEpisodes(series);
    const exact = all.filter(({ episode: e }) => fitOf(e, episode) === 'exact');
    if (exact.length > 0) {
      return exact.length === 1
        ? { found: exact[0]!, hasSimilar: false }
        : { found: null, hasSimilar: true };
    }
    const prefixed = lookupOnly(all, episode, 'prefix');
    if (prefixed) {
      return prefixed;
    }
    if (onlySeason !== null) {
      const inOnly = lookupIn(await episodesIn(series, onlySeason), episode);
      if (inOnly.found) {
        return inOnly;
      }
    }
    return (
      lookupOnly(all, episode, 'loose') ?? {
        found: null,
        hasSimilar: hasFit(all, episode, 'similar'),
      }
    );
  };

  /** The episodes to pick from: the row's season (else all), best fit first. */
  const episodesToPick = async (
    series: TvSeries,
    { season, episode }: Target,
  ): Promise<ReadonlyArray<EpisodeOption>> => {
    const inSeason = season === null ? [] : await episodesIn(series, season);
    const pool = inSeason.length > 0 ? inSeason : await allEpisodes(series);
    return rankEpisodes(pool, episode)
      .slice(0, MAX_EPISODE_OPTIONS)
      .map(toOption);
  };

  const episodeNotFound = async (
    series: TvSeries,
    target: Target,
  ): Promise<MatchResult> => ({
    kind: 'problem',
    problem: {
      episodes: await episodesToPick(series, target),
      kind: 'episode-not-found',
      series: toCandidate(series),
    },
  });

  const matched = (series: TvSeries, found: Found): MatchResult => ({
    episode: found.episode,
    kind: 'matched',
    seasonNumber: found.seasonNumber,
    tvSeries: series,
  });

  /** The series the user picked: exactly it, and exactly the episode they picked. */
  const matchPicked = async (
    row: Pick<
      ImportRow,
      'seasonNumber' | 'episodeNumber' | 'season' | 'episode'
    >,
    seriesId: number,
  ): Promise<MatchResult> => {
    const series = await getSeries(seriesId);
    if (!series) {
      return { kind: 'problem', problem: { kind: 'series-not-found' } };
    }
    if (row.seasonNumber !== undefined && row.episodeNumber !== undefined) {
      const episodes = (await getSeason(series.id, row.seasonNumber))?.episodes;
      const episode = episodes?.find(
        (e) => e.episodeNumber === row.episodeNumber,
      );
      return episode
        ? matched(series, { episode, seasonNumber: row.seasonNumber })
        : episodeNotFound(series, {
            episode: row.episode,
            season: row.seasonNumber,
          });
    }
    const target: Target = {
      episode: row.episode,
      season: recogniseSeasonNumber(row.season),
    };
    const { found } = await lookup(series, target);
    return found ? matched(series, found) : episodeNotFound(series, target);
  };

  const match = async (
    row: Pick<
      ImportRow,
      | 'title'
      | 'season'
      | 'episode'
      | 'seriesId'
      | 'seasonNumber'
      | 'episodeNumber'
    >,
  ): Promise<MatchResult> => {
    if (row.seriesId !== undefined) {
      return matchPicked(row, row.seriesId);
    }

    const title = normalizeTitle(row.title);
    const results = await searchFor(title);
    let exactResults = named(results, title);

    // No series has the tagged name ("The Office (U.K.)"): the namesakes the
    // tag names; none is never a guess
    const tag = exactResults.length === 0 ? readTag(title) : null;
    if (tag) {
      exactResults = named(await searchFor(tag.base), tag.base).filter(
        tag.fits,
      );
    }
    let target: Target = {
      episode: row.episode,
      season: recogniseSeasonNumber(row.season),
    };

    // A combined title cut in the show part splits as show and episode
    // ("Fit for TV" and "The Reality of the Biggest..."): without a season,
    // the whole may be the start of the show, its episode unknown
    const cutEpisode =
      typeof row.episode === 'string' ? cutPrefix(row.episode) : null;
    if (exactResults.length === 0 && cutEpisode && row.season === '') {
      const whole = normalizeTitle(`${row.title} ${row.episode}`);
      const wholeResults = named(await searchFor(whole), whole);
      if (wholeResults.length > 0) {
        exactResults = wholeResults;
        target = { episode: '', season: null };
      }
    }

    // Several series can share a title (Top Boy 2011 and 2019): the one that
    // certainly has the episode
    const looked: Array<Readonly<{ series: TvSeries; lookup: Lookup }>> = [];
    for (const result of exactResults) {
      const series = await getSeries(result.id);
      if (series) {
        looked.push({ lookup: await lookup(series, target), series });
      }
    }

    // Namesakes with the episode: the strongest evidence decides. Its exact
    // title, then its title past an article, then a number or a cut title;
    // a tie within the strongest stays the user's pick
    const found = looked.flatMap(({ lookup, series }) =>
      lookup.found
        ? [
            {
              lookup,
              series,
              tier: EVIDENCE_TIER[fitOf(lookup.found.episode, target.episode)],
            },
          ]
        : [],
    );
    const strongest = Math.min(...found.map(({ tier }) => tier));
    const having = found.filter(({ tier }) => tier === strongest);
    const [only] = having;
    if (only?.lookup.found && having.length === 1) {
      return matched(only.series, only.lookup.found);
    }
    // None certain: a series with a similar episode is offered first
    const offered =
      having.length > 1
        ? having
        : [...looked].sort(
            (a, b) => Number(b.lookup.hasSimilar) - Number(a.lookup.hasSimilar),
          );
    const [first] = offered;
    if (first && offered.length === 1) {
      return episodeNotFound(first.series, target);
    }
    if (first) {
      return {
        kind: 'problem',
        problem: {
          candidates: offered
            .slice(0, MAX_CANDIDATES)
            .map(({ series }) => toCandidate(series)),
          kind: 'ambiguous',
        },
      };
    }

    // No series with this exact title: never guess. Similar titles first,
    // then the top results, for the user to pick or skip.
    const similar = results.filter(
      (result) => compareTitles(result.title, title) === 'similar',
    );
    const rest = results.filter((result) => !similar.includes(result));
    const candidates = [...similar, ...rest]
      .slice(0, MAX_CANDIDATES)
      .map(toCandidate);
    return {
      kind: 'problem',
      problem:
        candidates.length > 0
          ? { candidates, kind: 'ambiguous' }
          : { kind: 'series-not-found' },
    };
  };

  return { match };
};
