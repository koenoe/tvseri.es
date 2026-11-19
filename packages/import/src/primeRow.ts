import type { ImportRow } from '@tvseri.es/schemas';

/**
 * Prime Video's watch history names a season in free text ("Show - Season
 * 2", "Show, Season 2", "SHOW (TV) - SEASON 01", or a bare "Season 3") and
 * each episode as "Episode <n>: <name>". These read the two; a season with
 * no show name is resolved by the caller from the season's detail page.
 */

/**
 * "… Season 2", after a dash, comma or space, and a split season's
 * "- Part 2"; "(TV)" before it is noise
 */
const SEASON =
  /^(.*?)[\s,–—-]*\bseason\s+0*(\d+)(?:\s*[,:–—-]?\s*part\s+(\d+))?\s*$/i;
const TV_TAG = /\s*\(TV\)\s*$/i;

/**
 * Prime Video's labels for a version, not part of the name: "(4K UHD)",
 * "(English Dubbed)", "[English Subtitled]", "[French Audio]"
 */
const VERSION_TAG =
  /\s*[[(][^\])]*\b(?:4K|UHD|HD|SD|dubbed|subtitled|audio|version)\b[^\])]*[\])]/gi;

/** "[US]": the matcher reads a country tag as "(US)" */
const COUNTRY_TAG = /\[([a-z]{2})\]/gi;

/** A title without its version labels, with its country tag the matcher's way */
export const primeTitle = (text: string): string =>
  text
    .replace(VERSION_TAG, '')
    .replace(COUNTRY_TAG, '($1)')
    .replace(/\s{2,}/g, ' ')
    .trim();

export type PrimeSeason = Readonly<{
  /** Which part of a split season ("Season 5 - Part 2"); 1 when not split */
  part: number;
  season: number | null;
  show: string | null;
}>;

export const primeSeason = (text: string): PrimeSeason => {
  const trimmed = primeTitle(text);
  const match = SEASON.exec(trimmed);
  if (!match) {
    return { part: 1, season: null, show: trimmed || null };
  }
  const show = (match[1] ?? '').replace(TV_TAG, '').trim();
  return {
    part: match[3] ? Number(match[3]) : 1,
    season: Number(match[2]),
    show: show || null,
  };
};

const EPISODE = /^episode\s+(\d+)\s*(?::\s*(.*))?$/i;

/**
 * "Episode 4: Into the Labyrinth" → 4 and its name. `null` for Episode 0
 * (Prime Video's trailers and extras) and for anything else.
 */
export const primeEpisode = (
  text: string,
): Readonly<{ name: string; number: number }> | null => {
  const match = EPISODE.exec(text.trim());
  const number = match ? Number(match[1]) : 0;
  return match && number > 0 ? { name: (match[2] ?? '').trim(), number } : null;
};

/** The watch provider name a synced Prime Video row carries */
const PRIME_VIDEO = 'Amazon Prime Video';

/**
 * One watched Prime Video episode as an import row: the season the caller
 * resolved (from the title, else its detail page) and the episode's
 * "Episode <n>: …" text. `null` for a trailer or extra.
 */
export const primeRow = (
  where: Readonly<{ part?: number; season: number; show: string }>,
  episodeText: string,
  index: number,
  watchedAt: number,
): ImportRow | null => {
  const episode = primeEpisode(episodeText);
  // A later part of a split season numbers its episodes from 1 again, so
  // only the name finds the episode in TMDB's whole season
  const byName = (where.part ?? 1) > 1 && episode?.name;
  return episode
    ? {
        episode: byName ? episode.name : episode.number,
        index,
        season: where.season,
        title: where.show,
        watchedAt,
        watchProvider: PRIME_VIDEO,
      }
    : null;
};
