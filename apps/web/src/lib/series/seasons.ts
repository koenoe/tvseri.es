import type { Season, TvSeries } from '@tvseri.es/schemas';

/**
 * A show's seasons as its page and the marking core use them: the regular
 * seasons, then the specials (season 0), which the API serves beside them
 * (`TvSeries.specials`) so its regular-only sums don't move. Progress, Next
 * up, time left and Finished skip season 0 on their own.
 */
export const seasonsWithSpecials = (
  series: Pick<TvSeries, 'seasons' | 'specials'>,
): ReadonlyArray<Season> =>
  series.specials
    ? [...(series.seasons ?? []), series.specials]
    : (series.seasons ?? []);
