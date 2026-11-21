/** A season mark of a season that hasn't started airing (or TMDB doesn't have) */
export class SeasonNotAiredError extends Error {
  override name = 'SeasonNotAiredError';
}

/** A whole-show mark of a show TMDB lists no seasons for */
export class NoSeasonsError extends Error {
  override name = 'NoSeasonsError';
}

/** A whole-show mark past MAX_EPISODES_PER_SERIES_MARK aired episodes */
export class TooManyEpisodesError extends Error {
  override name = 'TooManyEpisodesError';
}
