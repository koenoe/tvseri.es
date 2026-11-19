import type { ImportRow } from '@tvseri.es/schemas';

import { namesEpisode } from './netflixRow';
import { parseEpisodeNumber } from './parseEntry';

/** The watch provider name a synced iPlayer row carries */
const BBC_IPLAYER = 'BBC iPlayer';

/** A play as iPlayer reports it: how it last ended and where, in seconds */
type BbcPlay = Readonly<{ action: string; offset: number }>;

/** What iPlayer's catalogue says about the played episode */
type BbcEpisode = Readonly<{
  durationSeconds: number | null;
  /** The episode's number in its series, when iPlayer has one */
  parentPosition: number | null;
  /** "Series 4: 6. The Line", "Series 3: Episode 3", "Christmas Special" */
  subtitle: string;
  title: string;
}>;

/**
 * Within the last tenth of an episode counts as watched: the credits. The
 * player often stops sending "ended" (a heartbeat at 99 % is the last word).
 */
const WATCHED_SHARE = 0.9;

export const isWatched = (
  play: BbcPlay,
  durationSeconds: number | null,
): boolean =>
  play.action === 'ended' ||
  (durationSeconds !== null &&
    durationSeconds > 0 &&
    play.offset / durationSeconds >= WATCHED_SHARE);

/** "Series 4: 6. The Line" → the series part and the rest */
const SUBTITLE = /^(Series \d+)\s*:\s*(.*)$/i;

/**
 * One watched iPlayer play as an import row, dated by the caller. The episode
 * is its position, else "Episode 3" in the subtitle, else the subtitle as a
 * title. `null` when the play names no episode (a film or a one-off).
 */
export const bbcRow = (
  episode: BbcEpisode,
  index: number,
  watchedAt: number,
): ImportRow | null => {
  const match = SUBTITLE.exec(episode.subtitle.trim());
  const season = match?.[1] ?? '';
  const rest = (match ? (match[2] ?? '') : episode.subtitle).trim();
  const number = episode.parentPosition ?? parseEpisodeNumber(rest);
  const row = {
    episode: number ?? rest,
    index,
    season,
    title: episode.title.trim(),
    watchedAt,
    watchProvider: BBC_IPLAYER,
  };
  return namesEpisode(row) ? row : null;
};
