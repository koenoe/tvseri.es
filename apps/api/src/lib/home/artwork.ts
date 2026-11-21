import type { TvSeries } from '@tvseri.es/schemas';

import { detectDominantColorsFromImages } from '@/lib/detectDominantColorFromImage';
import { fetchTvSeriesImages } from '@/lib/tmdb/series';
import { logWarn } from '@/utils/logWarn';

/** A show the home moments can draw: it has a poster and a backdrop */
export const hasArtwork = (series: TvSeries) =>
  !!series.posterImage && !!series.backdropImage;

/**
 * The show with its title treatment (TMDB's logo in its own language), when
 * it has one. The logo is optional: a show without one, or whose images
 * can't be read, comes back as it was and the card writes the title.
 */
export const withTitleTreatment = async (
  series: TvSeries,
): Promise<TvSeries> => {
  const images = await fetchTvSeriesImages(
    series.id,
    series.originalLanguage,
  ).catch(() => undefined);
  const logo = images?.titleTreatment[0];
  if (!logo) {
    return series;
  }
  const { titleTreatmentAspectRatio: _, ...rest } = series;
  return {
    ...rest,
    ...(logo.width > 0 &&
      logo.height > 0 && {
        titleTreatmentAspectRatio: logo.width / logo.height,
      }),
    titleTreatmentImage: logo.url,
  };
};

/**
 * The dominant colour of each show's backdrop, by backdrop path, for the
 * moments drawn on their backdrop under a shade in its colour (Did you know,
 * the Countdown). Detected once per image and stored for good, so a day's
 * build mostly reads them. Best-effort: a failed detection leaves the path
 * out (the card keeps its near-black shade), never the moment.
 */
export const backdropColorsOf = (
  shows: ReadonlyArray<TvSeries>,
): Promise<ReadonlyMap<string, string>> =>
  detectDominantColorsFromImages({
    paths: shows.flatMap((series) =>
      series.backdropPath ? [series.backdropPath] : [],
    ),
    size: 'w780',
  }).catch((error: unknown) => {
    logWarn('Backdrop colours failed, the cards keep their shade', error);
    return new Map<string, string>();
  });

/**
 * The show with `backdropColor` set to its drawn backdrop's colour, when one
 * was detected (list items carry '#000000': unknown)
 */
export const withBackdropColor = (
  series: TvSeries,
  backdropPath: string | undefined,
  colors: ReadonlyMap<string, string>,
): TvSeries => {
  const color = backdropPath ? colors.get(backdropPath) : undefined;
  return color ? { ...series, backdropColor: color } : series;
};
