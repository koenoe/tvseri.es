const TMDB_IMAGES = 'https://image.tmdb.org/';

/**
 * TMDB logos go through the global image loader; anything else (a stub
 * server's, a future host) is shown as it is: `unoptimized`.
 */
export const isTmdbImage = (src: string) => src.startsWith(TMDB_IMAGES);
