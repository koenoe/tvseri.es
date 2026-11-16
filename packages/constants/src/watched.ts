/**
 * Marking a whole show watched writes every aired episode in one request
 * (inside the API's 14 s timeout). Above this many aired episodes the API
 * answers 413 and the web marks season by season instead.
 */
export const MAX_EPISODES_PER_SERIES_MARK = 1000;
