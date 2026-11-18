/**
 * The Watched table's key formats, built here for every reader and writer.
 * A user's partition (`USER#<userId>`) holds one item per watched episode,
 * sorted by `SERIES#<seriesId>#S<season>#E<episode>`. gsi1 groups a user's
 * episodes of one show (`USER#<userId>#SERIES#<seriesId>`, sorted by
 * `S<season>#E<episode>`); gsi2 holds the dated ones by time
 * (`USER#<userId>#WATCHED`). Never change a format: stored items keep the
 * one they were written with.
 */

/** Season and episode numbers are zero-padded to three digits (or more) */
const padded = (value: number) => value.toString().padStart(3, '0');

/** The partition key of a user's watched episodes */
export const watchedPk = (userId: string) => `USER#${userId}`;

/** Sort-key prefix of every watched episode */
export const WATCHED_SK_PREFIX = 'SERIES#';

/** Sort-key prefix of one show's episodes: `begins_with` for that show */
export const seriesSkPrefix = (seriesId: number | string) =>
  `${WATCHED_SK_PREFIX}${seriesId}#`;

/** The base-table sort key of one episode */
export const episodeSk = (
  seriesId: number | string,
  seasonNumber: number,
  episodeNumber: number,
) =>
  `${seriesSkPrefix(seriesId)}S${padded(seasonNumber)}#E${padded(episodeNumber)}`;

/**
 * A `BETWEEN` range over one show's episodes from a season on (1 leaves the
 * specials out, 0 takes them in) to the last
 */
export const seriesSkRange = (
  seriesId: number | string,
  fromSeason: number,
): Readonly<{ from: string; to: string }> => ({
  from: `${seriesSkPrefix(seriesId)}S${padded(fromSeason)}`,
  to: `${seriesSkPrefix(seriesId)}S999#E999`,
});

/** `SERIES#<id>#S<season>#…`: the series and its season of a watched sort key */
export const EPISODE_SK = /^SERIES#(\d+)#S(\d{3})#E(\d{3,4})/;

/** gsi1's partition key: one user's episodes of one show */
export const seriesIndexPk = (userId: string, seriesId: number | string) =>
  `USER#${userId}#SERIES#${seriesId}`;

/** gsi1's sort-key prefix of one season; with its `#`, season 100 never matches 1000 */
export const seasonIndexPrefix = (seasonNumber: number) =>
  `S${padded(seasonNumber)}#`;

/** gsi1's sort key of one episode */
export const episodeIndexSk = (seasonNumber: number, episodeNumber: number) =>
  `${seasonIndexPrefix(seasonNumber)}E${padded(episodeNumber)}`;

/** gsi2's partition key: a user's dated episodes, sorted by when */
export const historyIndexPk = (userId: string) => `USER#${userId}#WATCHED`;
