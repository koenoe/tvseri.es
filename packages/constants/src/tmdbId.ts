/**
 * TMDB ids (shows, people, keywords, networks) are positive integers below
 * 10^8: the largest are a few million, so eight digits leave ample room. A
 * path id with more digits can never exist: the web serves the static 404
 * for it, and nothing longer is ever sent to the API.
 */
export const MAX_TMDB_ID_DIGITS = 8;

/** A TMDB id as a path segment (no leading zero), as a regex source */
export const TMDB_ID_PATTERN = `[1-9]\\d{0,${MAX_TMDB_ID_DIGITS - 1}}`;
